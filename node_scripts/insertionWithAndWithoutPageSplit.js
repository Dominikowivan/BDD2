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

let insertionTimes = []; // To store insertion times for each batch
let pagesCreatedChanges = []; // Track changes in pages created

const BATCH_SIZES = [1000, 5000, 10000]; // Explicit batch sizes in correct order

// Function to monitor and log key InnoDB metrics
const collectInnoDBMetrics = async (connection) => {
    const result = await executeQuery(connection, "SHOW ENGINE INNODB STATUS;");
    const innodbStatus = result[0]['Status'];

    const pagesCreatedMatch = innodbStatus.match(/created\s+(\d+)/);

    let pagesCreated = pagesCreatedMatch ? parseInt(pagesCreatedMatch[1], 10) : 0;

    const pagesCreatedChange = pagesCreated - previousPagesCreated;

    // Collect changes for analysis
    pagesCreatedChanges.push(pagesCreatedChange);

    // Update previous values for next comparison
    previousPagesCreated = pagesCreated;
};

// Function to measure insertion performance for different batch sizes
const measureInsertionPerformance = async (connection, tableName, useManualId = false) => {
    console.log(`Starting insertion performance test for table: ${tableName}`);

    let globalIndex = 0; // Track global index for unique names
    let manualId = 1; // Start manual ID for Ninja_manual_id

    // Loop through the predefined batch sizes: 1000, 5000, 10000
    for (let batchSize of BATCH_SIZES) {
        console.log(`\nInserting records in batches of ${batchSize}...`);
        const totalBatches = Math.ceil(5000000 / batchSize);

        let stageStartTime = now(); // Start time for the current stage

        for (let batchNumber = 0; batchNumber < totalBatches; batchNumber++) {
            const ninjasBatch = [];

            for (let i = 0; i < batchSize; i++) {
                const ninja = createRandomNinja(globalIndex, manualId, useManualId); // Use global index for unique names
                ninjasBatch.push(ninja);
                globalIndex++; // Increment global index to ensure unique names
                manualId++; // Increment manual ID if needed
            }

            // Insert the batch of records
            const startBatchTime = now();
            if (useManualId) {
                await executeQuery(connection, `INSERT INTO ${tableName} (id, name, maxWeight, life) VALUES ?`, [ninjasBatch]);
            } else {
                await executeQuery(connection, `INSERT INTO ${tableName} (name, maxWeight, life) VALUES ?`, [ninjasBatch]);
            }
            const endBatchTime = now();

            // Store the time taken for this batch
            insertionTimes.push(endBatchTime - startBatchTime);

            // Collect InnoDB metrics after each batch
            await collectInnoDBMetrics(connection);
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
    }

    console.log(`\nInsertion performance test for ${tableName} completed.`);
};

// Function to create random ninja data with a globally unique name
const createRandomNinja = (globalIndex, manualId = null, useManualId = false) => {
    const name = `Ninja_${globalIndex}`; // Unique name across all batches
    const maxWeight = getRandomInt(50, 150);
    const life = getRandomInt(50, 150);

    // If using manual ID, include the ID in the batch
    return useManualId ? [manualId, name, maxWeight, life] : [name, maxWeight, life];
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

    console.log(`\nPerformance Summary for Batch Size: ${batchSize}`);
    console.log(`Average Insertion Time per Batch: ${avgInsertionTime.toFixed(2)} ms`);
    console.log(`Average Pages Created Change: ${pagesCreatedMean.toFixed(2)}`);
};

// Reset metrics after each batch size run
const resetMetrics = () => {
    insertionTimes = [];
    pagesCreatedChanges = [];
};

const createTables = async (connection) => {
    await executeQuery(connection, `
    CREATE TABLE IF NOT EXISTS Ninja (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      maxWeight INT NOT NULL,
      life INT NOT NULL
    );
  `);

    await executeQuery(connection, `
    CREATE TABLE IF NOT EXISTS Ninja_manual_id (
      id INT NOT NULL PRIMARY KEY,
      name VARCHAR(255),
      maxWeight INT NOT NULL,
      life INT NOT NULL
    );
  `);

    console.log('Database and tables created (if they did not already exist).');
};

const cleanTables = async (connection) => {
    await executeQuery(connection, `SET FOREIGN_KEY_CHECKS = 0;`);
    await executeQuery(connection, `TRUNCATE TABLE Ninja;`);
    await executeQuery(connection, `TRUNCATE TABLE Ninja_manual_id;`);

    await executeQuery(connection, `SET FOREIGN_KEY_CHECKS = 1;`);

    console.log('All data cleaned from tables.');
};

// Function to flush InnoDB tables and simulate clearing the cache
const flushInnoDBTables = async (connection) => {
    await executeQuery(connection, "FLUSH TABLES;");
    console.log("InnoDB tables flushed");
};

// Use connections and run the test with flush between
useConnections([connection_config.local], async (connection) => {
    await createTables(connection);
    await cleanTables(connection);

    // Ignore first one, its a warm-up.  basically, the data is messed up and couldnt find a way to fix it in the time i had.
    await measureInsertionPerformance(connection, 'Ninja_manual_id', true); // Manual ID test

    await cleanTables(connection);
    await measureInsertionPerformance(connection, 'Ninja_manual_id', true); // Manual ID test
    await measureInsertionPerformance(connection, 'Ninja'); // Auto-increment test
});
