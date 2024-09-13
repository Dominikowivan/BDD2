const {
    executeQuery,
    useConnections,
    insertInBatches,
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

let previousPagesCreated = 0;

// Function to monitor and log key InnoDB metrics
const collectInnoDBMetrics = async (connection, description) => {
    const result = await executeQuery(connection, "SHOW ENGINE INNODB STATUS;");
    const innodbStatus = result[0]['Status'];

    const pagesCreatedMatch = innodbStatus.match(/created\s+(\d+)/);

    let pagesCreated = pagesCreatedMatch ? parseInt(pagesCreatedMatch[1], 10) : 0;

    const pagesCreatedChange = pagesCreated - previousPagesCreated;

    await console.log(`\nInnoDB Metrics ${description}:`);
    await console.log(`Pages Created Change: ${pagesCreatedChange}`);

    // Update previous values for next comparison
    previousPagesCreated = pagesCreated;
};

// Function to create tables with only primary key
const createTablesPrimaryKeyOnly = async (connection) => {
    await executeQuery(connection, `
    CREATE TABLE IF NOT EXISTS Ninja (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      maxWeight INT NOT NULL,
      life INT NOT NULL
    );
  `);
    await console.log('Table with only primary key created.');
};

// Function to create table without a primary key
const createTableWithoutPrimaryKey = async (connection) => {
    await executeQuery(connection, `
    CREATE TABLE IF NOT EXISTS NinjaWithoutPK (
      name VARCHAR(255) NOT NULL,
      maxWeight INT NOT NULL,
      life INT NOT NULL
    );
  `);
   await console.log('Table without primary key created.');
};

// Function to add indexes to all columns
const addIndexes = async (connection) => {
    await executeQuery(connection, `
    ALTER TABLE Ninja 
    ADD INDEX (name),
    ADD INDEX (maxWeight),
    ADD INDEX (life);
  `);
   await console.log('Indexes added to all columns.');
};

// Function to insert random data into the table
const insertRandomData = async (connection, numberOfEntries, tableName) => {
    const ninjas = [];
    for (let i = 0; i < numberOfEntries; i++) {
        const ninja = createRandomNinja(i);
        ninjas.push(ninja);
    }
    await insertInBatches(connection, `INSERT INTO ${tableName} (name, maxWeight, life) VALUES ?`, ninjas, 1000, true);
    await console.log("Random data inserted.");
};

// Function to measure the time it takes to delete all rows from the table and log InnoDB metrics
const measureDeletionTime = async (connection, description, tableName) => {
    await console.log(`\nStarting deletion test: ${description}`);

    // Collect InnoDB metrics before deletion
    await console.log("Collecting InnoDB metrics before deletion...");
    await collectInnoDBMetrics(connection, 'before deletion');

    const startTime = now();
    await executeQuery(connection, `DELETE FROM ${tableName};`);
    const endTime = now();
    const elapsedTime = (endTime - startTime).toFixed(2);
    await console.log(`Deletion time (${description}): ${elapsedTime} ms`);

    // Collect InnoDB metrics after deletion
    await console.log("Collecting InnoDB metrics after deletion...");
    await collectInnoDBMetrics(connection, 'after deletion');
};

// Function to measure the time and metrics during insertions
const measureInsertionTime = async (connection, description, numberOfEntries, tableName) => {
    await console.log(`\nStarting insertion test: ${description}`);

    // Collect InnoDB metrics before insertion
    await console.log("Collecting InnoDB metrics before insertion...");
    await collectInnoDBMetrics(connection, 'before insertion');

    const startTime = now();
    await insertRandomData(connection, numberOfEntries, tableName);
    const endTime = now();
    const elapsedTime = (endTime - startTime).toFixed(2);
    await console.log(`Insertion time (${description}): ${elapsedTime} ms`);

    // Collect InnoDB metrics after insertion
    await console.log("Collecting InnoDB metrics after insertion...");
    await collectInnoDBMetrics(connection, 'after insertion');
};

// Function to create random ninja data
const createRandomNinja = (index) => {
    const name = `Ninja_${index}`;
    const maxWeight = getRandomInt(50, 150);
    const life = getRandomInt(50, 150);
    return [name, maxWeight, life];
};

// Helper function to generate a random integer between min and max
const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Cleanup tables function
const cleanTables = async (connection) => {
    await executeQuery(connection, `SET FOREIGN_KEY_CHECKS = 0;`);
    await executeQuery(connection, `TRUNCATE TABLE Ninja;`);
    await executeQuery(connection, `TRUNCATE TABLE NinjaWithoutPK;`);
    await executeQuery(connection, `SET FOREIGN_KEY_CHECKS = 1;`);
    await console.log('All data cleaned from tables.');
};

// Main execution logic
useConnections([connection_config.local], async (connection) => {
    const numberOfEntries = 100000; // Adjust for larger tests if necessary

    await collectInnoDBMetrics(connection, 'Before our test');
    // Test 1: Insertion and Deletion with a Table without Primary Key
    await console.log("############################")
    await cleanTables(connection);
    await createTableWithoutPrimaryKey(connection);
    await measureInsertionTime(connection, 'No Primary Key', numberOfEntries, 'NinjaWithoutPK');
    await measureDeletionTime(connection, 'No Primary Key', 'NinjaWithoutPK');

    // Test 2: Insertion and Deletion with only Primary Key
    await console.log("############################")
    await cleanTables(connection);
    await createTablesPrimaryKeyOnly(connection);
    await measureInsertionTime(connection, 'Primary Key Only', numberOfEntries, 'Ninja');
    await measureDeletionTime(connection, 'Primary Key Only', 'Ninja');

    // Test 3: Insertion and Deletion with Indexes on All Columns
    await console.log("############################")
    await cleanTables(connection);
    await createTablesPrimaryKeyOnly(connection); // Recreate the table
    await addIndexes(connection); // Add indexes
    await measureInsertionTime(connection, 'With Indexes on All Columns', numberOfEntries, 'Ninja');
    await measureDeletionTime(connection, 'With Indexes on All Columns', 'Ninja');
});
