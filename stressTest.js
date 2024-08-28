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
        const params = paramsGenerator();
        await executeQuery(connection, query, params);

        const currentTime = now();
        if ((currentTime - lastLogTime) > LOG_INTERVAL_MS) {
            const progress = ((i + 1) / testCount) * 100;
            console.log(`Progress: ${progress.toFixed(2)}% completed.`);
            lastLogTime = currentTime;
        }
    }

    const endTime = now();
    return (endTime - startTime).toFixed(2);
};

const stressTest = async (connection, testCount = TEST_COUNT) => {
    console.log("Starting stress test...");

    const indexedTestDuration = await runQueryTest(
        connection,
        "SELECT * FROM Ninja WHERE id = ?",
        () => [getRandomNinjaId()],
        testCount
    );
    console.log(`Indexed column (id) test completed in ${indexedTestDuration} ms`);

    const nonIndexedTestDuration = await runQueryTest(
        connection,
        "SELECT * FROM Ninja WHERE name = ?",
        () => [getRandomNinjaName()],
        testCount
    );
    console.log(`Non-indexed column (name) test completed in ${nonIndexedTestDuration} ms`);

    console.log("Stress test completed.");
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
