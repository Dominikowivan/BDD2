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

// Monitorear InnoDB Status después de inserciones y eliminaciones
const logInnoDBStatus = async (connection) => {
    const result = await executeQuery(connection, "SHOW ENGINE INNODB STATUS;");
    const innodbStatus = result[0]['Status'];

    // Extrae solo las métricas clave: páginas creadas y buffers libres
    const pagesCreatedMatch = innodbStatus.match(/created\s+(\d+)/);
    const freeBuffersMatch = innodbStatus.match(/Free buffers\s+(\d+)/);

    console.log("\nInnoDB Status:");
    console.log(`Pages Created: ${pagesCreatedMatch ? pagesCreatedMatch[1] : "Not Found"}`);
    console.log(`Free Buffers: ${freeBuffersMatch ? freeBuffersMatch[1] : "Not Found"}`);
};

// Función para insertar y eliminar registros
const measureInsertionAndDeletionPerformance = async (connection) => {
    const BATCH_SIZE = 1000;
    const TOTAL_RECORDS = 50000; // Reducimos la cantidad de registros
    const totalBatches = Math.ceil(TOTAL_RECORDS / BATCH_SIZE);

    console.log("Starting insertion and deletion test...");

    for (let batchNumber = 0; batchNumber < totalBatches; batchNumber++) {
        const ninjasBatch = [];
        for (let i = 0; i < BATCH_SIZE; i++) {
            const ninja = createRandomNinja(batchNumber * BATCH_SIZE + i);
            ninjasBatch.push(ninja);
        }

        // Insertar el lote de registros
        await executeQuery(connection, "INSERT INTO Ninja (name, maxWeight, life) VALUES ?", [ninjasBatch]);

        // Eliminar algunos registros (e.g., eliminar la mitad del lote) para observar el impacto en índices y bloques
        const idsToDelete = ninjasBatch.slice(0, BATCH_SIZE / 2).map((ninja, idx) => batchNumber * BATCH_SIZE + idx);
        await executeQuery(connection, `DELETE FROM Ninja WHERE id IN (?)`, [idsToDelete]);

        // Monitorear el estado de InnoDB después de la eliminación
        await logInnoDBStatus(connection);

        // Mostrar el progreso de la operación
        const progress = ((batchNumber + 1) / totalBatches) * 100;
        console.log(`[Batch ${batchNumber + 1}/${totalBatches}] Progress: ${progress.toFixed(2)}%`);
    }

    console.log("\nInsertion and deletion test completed.");
};

// Crear datos de Ninja aleatorios
const createRandomNinja = (index) => {
    const name = `Ninja_${index}`;
    const maxWeight = getRandomInt(50, 150);
    const life = getRandomInt(50, 150);
    return [name, maxWeight, life];
};

// Función para obtener un número aleatorio
const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Usar conexiones y ejecutar el test
useConnections([connection_config.local], async (connection) => {
    await measureInsertionAndDeletionPerformance(connection);
});
