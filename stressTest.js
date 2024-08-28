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
const TEST_COUNT = 10;
const MAX_NINJA_ID = 5000000;
const LOG_INTERVAL_MS = 1000; // Log progress every second

const runQueryTest = async (connection, query, paramsGenerator, testCount) => {
    const startTime = now();
    let lastLogTime = startTime;

    for (let i = 0; i < testCount; i++) {
        await executeQuery(connection, query, paramsGenerator());

        lastLogTime = logProgressIfNeeded(i, testCount, startTime, lastLogTime);
    }

    return calculateElapsedTime(startTime).toFixed(2);
};

const logProgressIfNeeded = (iteration, testCount, startTime, lastLogTime) => {
    const currentTime = now();
    if ((currentTime - lastLogTime) > LOG_INTERVAL_MS) {
        const progress = calculateProgress(iteration, testCount);
        console.log(`Progress: ${progress}% completed. Elapsed time: ${formatElapsedTime(currentTime - startTime)}`);
        return currentTime;
    }
    return lastLogTime;
};

const calculateProgress = (iteration, testCount) => {
    return ((iteration + 1) / testCount * 100).toFixed(2);
};

const calculateElapsedTime = (startTime) => {
    return now() - startTime;
};

const stressTest = async (connection, testCount = TEST_COUNT) => {
    console.log("Starting stress test...");

    const indexedTestDuration = await runQueryTest(
        connection,
        "SELECT * FROM Ninja WHERE id = ?",
        () => [getRandomNinjaId()],
        testCount
    );
    console.log(`Indexed column (id) test completed in ${formatElapsedTime(indexedTestDuration)}`);

    const nonIndexedTestDuration = await runQueryTest(
        connection,
        "SELECT * FROM Ninja WHERE name = ?",
        () => [getRandomNinjaName()],
        testCount
    );
    console.log(`Non-indexed column (name) test completed in ${formatElapsedTime(nonIndexedTestDuration)}`);

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
