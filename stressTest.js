const {
    executeQuery,
    useConnections,
} = require("./lib/sqlUtilities");

const now = require("performance-now");

const connection_config = {
    local: {
        host: "localhost",
        user: "root",
        password: "root",
        database: "bdd2",
        port: 3306,
    },
};

// Constants
const TEST_COUNT = 100;
const MAX_NINJA_ID = 5000000;

const runQueryTest = async (connection, query, paramsGenerator, testCount, columnName) => {
    console.log(`Running test to retrieve ${testCount} registries using column: [${columnName}].`);

    const startTime = now();
    let totalRowsRetrieved = 0;

    for (let i = 0; i < testCount; i++) {
        const result = await executeQuery(connection, query, paramsGenerator());
        totalRowsRetrieved += result.length;

        logProgressIfNeeded(i, testCount, startTime, columnName);
    }

    const elapsedTime = calculateElapsedTime(startTime).toFixed(2);
    console.log(`Final log for column [${columnName}]: Retrieved a total of ${totalRowsRetrieved} rows in ${formatElapsedTime(elapsedTime)}\n`);
    return elapsedTime;
};

const logProgressIfNeeded = (iteration, testCount, startTime, columnName) => {
    const progress = calculateProgress(iteration, testCount);
    if (progress % 10 === 0) { 
        console.log(`[${columnName}] Progress: ${progress}% completed. Elapsed time: ${formatElapsedTime(now() - startTime)}`);
    }
};

const calculateProgress = (iteration, testCount) => {
    return Math.floor(((iteration + 1) / testCount) * 100);
};

const calculateElapsedTime = (startTime) => {
    return now() - startTime;
};

const stressTest = async (connection, testCount = TEST_COUNT) => {
    console.log("Starting stress test...");

    await runQueryTest(
        connection,
        "SELECT * FROM Ninja WHERE id = ?",
        () => [getRandomNinjaId()],
        testCount,
        "id"
    );

    await runQueryTest(
        connection,
        "SELECT * FROM Ninja WHERE name = ?",
        () => [getRandomNinjaName()],
        testCount,
        "name"
    );

    console.log("Stress test completed.");
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

// Helper Functions
const getRandomNinjaId = () => {
    return Math.floor(Math.random() * MAX_NINJA_ID) + 1;
};

const getRandomNinjaName = () => {
    return `Ninja_${getRandomNinjaId()}`;
};

useConnections([connection_config.local], async (connection) => {
    await stressTest(connection);
});
