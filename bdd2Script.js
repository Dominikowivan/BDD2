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
    CREATE TABLE IF NOT EXISTS Item (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      weight INT NOT NULL,
      ninja_id INT,
      FOREIGN KEY (ninja_id) REFERENCES Ninja(id)
    );
  `);

    await executeQuery(connection, `
    CREATE TABLE IF NOT EXISTS Rank (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rank_name ENUM('Genin', 'Chunin', 'Jonin') NOT NULL,
      ninja_id INT,
      FOREIGN KEY (ninja_id) REFERENCES Ninja(id)
    );
  `);

    await executeQuery(connection, `
    CREATE TABLE IF NOT EXISTS Genin (
      id INT AUTO_INCREMENT PRIMARY KEY,
      skill_level INT NOT NULL,
      rank_id INT,
      FOREIGN KEY (rank_id) REFERENCES Rank(id)
    );
  `);

    await executeQuery(connection, `
    CREATE TABLE IF NOT EXISTS Chunin (
      id INT AUTO_INCREMENT PRIMARY KEY,
      leadership_ability INT NOT NULL,
      rank_id INT,
      FOREIGN KEY (rank_id) REFERENCES Rank(id)
    );
  `);

    await executeQuery(connection, `
    CREATE TABLE IF NOT EXISTS Jonin (
      id INT AUTO_INCREMENT PRIMARY KEY,
      strategy_skill INT NOT NULL,
      rank_id INT,
      FOREIGN KEY (rank_id) REFERENCES Rank(id)
    );
  `);

    console.log('Database and tables created (if they did not already exist).');
};

const insertRandomData = async (connection, numberOfEntries) => {
    const ninjas = [];
    const items = [];
    const ranks = [];
    const genins = [];
    const chunins = [];
    const jonins = [];

    for (let i = 0; i < numberOfEntries; i++) {
        const ninja = createRandomNinja(i);
        ninjas.push(ninja.data);

        const ninjaItems = createRandomItems(i, ninja.id);
        items.push(...ninjaItems);

        const rank = createRandomRank(i, genins, chunins, jonins);
        ranks.push(rank.data);
    }

    await batchInsertData(connection, ninjas, items, ranks, genins, chunins, jonins);

    console.log("Random data inserted.");
};

// Helper functions

const createRandomNinja = (index) => {
    const id = index + 1;
    const name = `Ninja_${index}`;
    const maxWeight = getRandomInt(50, 150);
    const life = getRandomInt(50, 150);
    return {
        id,
        data: [name, maxWeight, life],
    };
};

const createRandomItems = (ninjaIndex, ninjaId) => {
    const numberOfItems = getRandomInt(1, 5);
    const items = [];

    for (let j = 0; j < numberOfItems; j++) {
        const itemName = `Item_${ninjaIndex}_${j}`;
        const weight = getRandomInt(1, 20);
        items.push([itemName, weight, ninjaId]);
    }

    return items;
};

const createRandomRank = (index, genins, chunins, jonins) => {
    const rankId = index + 1;
    const ranks = ['Genin', 'Chunin', 'Jonin'];
    const rankName = ranks[Math.floor(Math.random() * ranks.length)];

    if (rankName === 'Genin') {
        const skillLevel = getRandomInt(50, 150);
        genins.push([skillLevel, rankId]);
    } else if (rankName === 'Chunin') {
        const leadershipAbility = getRandomInt(50, 150);
        chunins.push([leadershipAbility, rankId]);
    } else if (rankName === 'Jonin') {
        const strategySkill = getRandomInt(50, 150);
        jonins.push([strategySkill, rankId]);
    }

    return {
        id: rankId,
        data: [rankName, rankId],
    };
};

const batchInsertData = async (connection, ninjas, items, ranks, genins, chunins, jonins) => {
    await insertInBatches(connection, "INSERT INTO Ninja (name, maxWeight, life) VALUES ?", ninjas);
    await insertInBatches(connection, "INSERT INTO Item (name, weight, ninja_id) VALUES ?", items);
    await insertInBatches(connection, "INSERT INTO Rank (rank_name, ninja_id) VALUES ?", ranks);
    await insertInBatches(connection, "INSERT INTO Genin (skill_level, rank_id) VALUES ?", genins);
    await insertInBatches(connection, "INSERT INTO Chunin (leadership_ability, rank_id) VALUES ?", chunins);
    await insertInBatches(connection, "INSERT INTO Jonin (strategy_skill, rank_id) VALUES ?", jonins);
};

const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const cleanTables = async (connection) => {
    await executeQuery(connection, `SET FOREIGN_KEY_CHECKS = 0;`);
    await executeQuery(connection, `TRUNCATE TABLE Genin;`);
    await executeQuery(connection, `TRUNCATE TABLE Chunin;`);
    await executeQuery(connection, `TRUNCATE TABLE Jonin;`);
    await executeQuery(connection, `TRUNCATE TABLE Rank;`);
    await executeQuery(connection, `TRUNCATE TABLE Item;`);
    await executeQuery(connection, `TRUNCATE TABLE Ninja;`);

    await executeQuery(connection, `SET FOREIGN_KEY_CHECKS = 1;`);

    console.log('All data cleaned from tables.');
};

useConnections([connection_config.local], async (connection) => {
    await createTables(connection);
    await cleanTables(connection);
    await insertRandomData(connection, 5000000);
});
