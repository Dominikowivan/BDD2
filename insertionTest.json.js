const {
    executeQuery,
    useConnections,
} = require("./lib/sqlUtilities");

const now = require("performance-now");
const stats = require("stats-lite");

const connection_config = {
    local: {
        host: "localhost",
        user: "root",
        password: "root",
        database: "bdd2",
        port: 3306,
    },
};

let previousPagesCreated = 0;
let previousFreeBuffers = null;

let insertionTimes = []; // To store insertion times for each batch
let pagesCreatedChanges = []; // Track changes in pages created
let freeBufferDrops = []; // Track free buffer changes

const BATCH_SIZES = [100, 1000, 5000, 10000]; // Explicit batch sizes in correct order

// Function to monitor and log key InnoDB metrics
const collectInnoDBMetrics = async (connection) => {
    const result = await executeQuery(connection, "SHOW ENGINE INNODB STATUS;");
    const innodbStatus = result[0]['Status'];

    const pagesCreatedMatch = innodbStatus.match(/created\s+(\d+)/);
    const freeBuffersMatch = innodbStatus.match(/Free buffers\s+(\d+)/);

    let pagesCreated = pagesCreatedMatch ? parseInt(pagesCreatedMatch[1], 10) : 0;
    let freeBuffers = freeBuffersMatch ? parseInt(freeBuffersMatch[1], 10) : null;

    const pagesCreatedChange = pagesCreated - previousPagesCreated;
    const freeBufferChange = previousFreeBuffers ? previousFreeBuffers - freeBuffers : 0;

    // Collect changes for analysis
    pagesCreatedChanges.push(pagesCreatedChange);
    if (freeBufferChange > 0) {
        freeBufferDrops.push(freeBufferChange);
    }

    // Update previous values for next comparison
    previousPagesCreated = pagesCreated;
    previousFreeBuffers = freeBuffers;
};

// Function to measure insertion performance for different batch sizes
const measureInsertionPerformance = async (connection) => {
    console.log("Starting insertion performance test...");

    // Loop through the predefined batch sizes: 1000, 5000, 10000
    for (let batchSize of BATCH_SIZES) {
        console.log(`\nInserting records in batches of ${batchSize}...`);
        const totalBatches = Math.ceil(5000000 / batchSize);

        let stageStartTime = now(); // Start time for the current stage

        for (let batchNumber = 0; batchNumber < totalBatches; batchNumber++) {
            const ninjasBatch = [];

            for (let i = 0; i < batchSize; i++) {
                const ninja = createRandomNinja(batchNumber * batchSize + i);
                ninjasBatch.push(ninja);
            }

            // Insert the batch of records
            const startBatchTime = now();
            await executeQuery(connection, "INSERT INTO Ninja (name, maxWeight, life) VALUES ?", [ninjasBatch]);
            const endBatchTime = now();

            // Store the time taken for this batch
            insertionTimes.push(endBatchTime - startBatchTime);

            // Collect InnoDB metrics after each batch
            await collectInnoDBMetrics(connection);

            // Log batch progress at 10% intervals
            const progressPercentage = ((batchNumber + 1) / totalBatches) * 100;
            if (progressPercentage % 10 === 0 || batchNumber + 1 === totalBatches) {
                console.log(`[Batch ${batchNumber + 1}/${totalBatches}] Progress: ${progressPercentage.toFixed(2)}%`);
            }
        }

        // Measure the time taken for this batch size
        const stageEndTime = now();
        const stageElapsedTime = stageEndTime - stageStartTime;

        console.log(`\nCompleted inserting 5000000 records in batches of ${batchSize}.`);
        console.log(`Time taken for this stage: ${formatElapsedTime(stageElapsedTime)}.`);

        // Print statistics for this stage
        printStageStatistics(batchSize);

        // Clear metrics for the next batch size
        resetMetrics();
        await cleanTables(connection);
    }

    console.log("\nInsertion performance test completed.");
};

// Function to create random ninja data
const createRandomNinja = (index) => {
    const name = `Ninja_${index}`;
    const maxWeight = getRandomInt(50, 150);
    const life = getRandomInt(50, 150);
    return [name, maxWeight, life];
};

// Helper functions
const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const formatElapsedTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const ms = Math.floor(milliseconds % 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        const remainingMinutes = minutes % 60;
        const remainingSeconds = seconds % 60;
        return `${hours}h ${remainingMinutes}m ${remainingSeconds}s ${ms}ms`;
    } else if (minutes > 0) {
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s ${ms}ms`;
    } else {
        return `${seconds}s ${ms}ms`;
    }
};

// Print performance statistics for the current stage
const printStageStatistics = (batchSize) => {
    const avgInsertionTime = stats.mean(insertionTimes);
    const pagesCreatedMean = stats.mean(pagesCreatedChanges);
    const freeBufferDropsMean = stats.mean(freeBufferDrops);

    console.log(`\nPerformance Summary for Batch Size: ${batchSize}`);
    console.log(`Average Insertion Time per Batch: ${avgInsertionTime.toFixed(2)} ms`);
    console.log(`Average Pages Created Change: ${pagesCreatedMean.toFixed(2)}`);
    console.log(`Average Free Buffer Drops: ${freeBufferDropsMean.toFixed(2)}`);
};

// Reset metrics after each batch size run
const resetMetrics = () => {
    insertionTimes = [];
    pagesCreatedChanges = [];
    freeBufferDrops = [];
};

const cleanTables = async (connection) => {
    await executeQuery(connection, `SET FOREIGN_KEY_CHECKS = 0;`);
    await executeQuery(connection, `TRUNCATE TABLE Apprentice;`);
    await executeQuery(connection, `TRUNCATE TABLE Practicioner;`);
    await executeQuery(connection, `TRUNCATE TABLE Master;`);
    await executeQuery(connection, `TRUNCATE TABLE \`Rank\`;`);
    await executeQuery(connection, `TRUNCATE TABLE Item;`);
    await executeQuery(connection, `TRUNCATE TABLE Ninja;`);

    await executeQuery(connection, `SET FOREIGN_KEY_CHECKS = 1;`);

    console.log('All data cleaned from tables.');
};


// Use connections and run the test
useConnections([connection_config.local], async (connection) => {
    await cleanTables(connection);
    await measureInsertionPerformance(connection);
});
