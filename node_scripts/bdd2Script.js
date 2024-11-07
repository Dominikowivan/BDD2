const {
    executeQuery,
    useConnections,
    insertInBatches,
} = require("./lib/sqlUtilities");

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
      life INT NOT NULL,
      age INT NOT NULL
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
    CREATE TABLE IF NOT EXISTS \`Rank\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rank_name ENUM('Apprentice', 'Practicioner', 'Master') NOT NULL,
      ninja_id INT,
      FOREIGN KEY (ninja_id) REFERENCES Ninja(id)
    );
  `);

    await executeQuery(connection, `
    CREATE TABLE IF NOT EXISTS Apprentice (
      id INT AUTO_INCREMENT PRIMARY KEY,
      skill_level INT NOT NULL,
      rank_id INT,
      FOREIGN KEY (rank_id) REFERENCES \`Rank\`(id)
    );
  `);

    await executeQuery(connection, `
    CREATE TABLE IF NOT EXISTS Practicioner (
      id INT AUTO_INCREMENT PRIMARY KEY,
      leadership_ability INT NOT NULL,
      rank_id INT,
      FOREIGN KEY (rank_id) REFERENCES \`Rank\`(id)
    );
  `);

    await executeQuery(connection, `
    CREATE TABLE IF NOT EXISTS Master (
      id INT AUTO_INCREMENT PRIMARY KEY,
      strategy_skill INT NOT NULL,
      rank_id INT,
      FOREIGN KEY (rank_id) REFERENCES \`Rank\`(id)
    );
  `);

    console.log('Database and tables created (if they did not already exist).');
};

const insertRandomData = async (connection, numberOfEntries) => {
    const ninjas = [];
    const items = [];
    const ranks = [];
    const apprentices = [];
    const practicioners = [];
    const masters = [];

    const rankDistribution = { Apprentice: 0.5, Practicioner: 0.3, Master: 0.2 };

    for (let i = 0; i < numberOfEntries; i++) {
        const rankName = assignRankBasedOnDistribution(rankDistribution);
        const ninja = createRandomNinja(i, rankName);
        ninjas.push(ninja.data);

        const ninjaItems = createRandomItems(i, ninja.id, rankName);
        items.push(...ninjaItems);

        const rank = createRandomRank(i, rankName, apprentices, practicioners, masters);
        ranks.push(rank.data);
    }

    await batchInsertData(connection, ninjas, items, ranks, apprentices, practicioners, masters);

    console.log("Random skewed data inserted.");
};

// Helper functions

const assignRankBasedOnDistribution = (distribution) => {
    const random = Math.random();
    if (random < distribution.Apprentice) {
        return 'Apprentice';
    } else if (random < distribution.Apprentice + distribution.Practicioner) {
        return 'Practicioner';
    } else {
        return 'Master';
    }
};

const createRandomNinja = (index, rankName) => {
    const id = index + 1;
    const name = `Ninja_${index}`;
    let maxWeight, life, age;

    if (rankName === 'Apprentice') {
        maxWeight = getRandomInt(50, 100);
        life = getRandomInt(50, 100);
        age = getRandomInt(18, 25);
    } else if (rankName === 'Practicioner') {
        maxWeight = getRandomInt(80, 130);
        life = getRandomInt(80, 130);
        age = getRandomInt(25, 35);
    } else if (rankName === 'Master') {
        maxWeight = getRandomInt(120, 150);
        life = getRandomInt(120, 150);
        age = getRandomInt(35, 50);
    }

    return {
        id,
        data: [name, maxWeight, life, age],
    };
};

const createRandomItems = (ninjaIndex, ninjaId, rankName) => {
    const items = [];
    let numberOfItems, weightRange;

    if (rankName === 'Apprentice') {
        numberOfItems = getRandomInt(3, 6);
        weightRange = { min: 1, max: 10 };
    } else if (rankName === 'Practicioner') {
        numberOfItems = getRandomInt(2, 4);
        weightRange = { min: 5, max: 15 };
    } else if (rankName === 'Master') {
        numberOfItems = getRandomInt(1, 3);
        weightRange = { min: 10, max: 20 };
    }

    for (let j = 0; j < numberOfItems; j++) {
        const itemName = `Item_${ninjaIndex}_${j}`;
        const weight = getRandomInt(weightRange.min, weightRange.max);
        items.push([itemName, weight, ninjaId]);
    }

    return items;
};

const createRandomRank = (index, rankName, apprentices, practicioners, masters) => {
    const rankId = index + 1;

    if (rankName === 'Apprentice') {
        const skillLevel = getRandomInt(50, 100);
        apprentices.push([skillLevel, rankId]);
    } else if (rankName === 'Practicioner') {
        const leadershipAbility = getRandomInt(50, 100);
        practicioners.push([leadershipAbility, rankId]);
    } else if (rankName === 'Master') {
        const strategySkill = getRandomInt(50, 100);
        masters.push([strategySkill, rankId]);
    }

    return {
        id: rankId,
        data: [rankName, rankId],
    };
};

const batchInsertData = async (connection, ninjas, items, ranks, apprentices, practicioners, masters) => {
    await insertInBatches(connection, "INSERT INTO Ninja (name, maxWeight, life, age) VALUES ?", ninjas);
    await insertInBatches(connection, "INSERT INTO Item (name, weight, ninja_id) VALUES ?", items);
    await insertInBatches(connection, "INSERT INTO \`Rank\` (rank_name, ninja_id) VALUES ?", ranks);
    await insertInBatches(connection, "INSERT INTO Apprentice (skill_level, rank_id) VALUES ?", apprentices);
    await insertInBatches(connection, "INSERT INTO Practicioner (leadership_ability, rank_id) VALUES ?", practicioners);
    await insertInBatches(connection, "INSERT INTO Master (strategy_skill, rank_id) VALUES ?", masters);
};

const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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

useConnections([connection_config.local], async (connection) => {
    await createTables(connection);
    await cleanTables(connection);
    await insertRandomData(connection, 1000000);
});
