const mysql = require("mysql2");
const util = require("util");

const createConnection = (config) => {
  console.log("Creating connection to database: " + config.host);

  const connection = mysql.createConnection(config);
  connection.connect();
  connection.query = util.promisify(connection.query);
  return connection;
};

const executeQuery = (connection, query, params = []) => {
  return connection.query(query, params);
};

const executeQueryAndGetMetadata = async (connection, query, params = []) => {
  const result = await connection.query(query, params);
  return result;
};

const executeQueryUntilAffectedRowsAreOverLimit = async (
  connection,
  query,
  limit,
  counter = 1
) => {
  const result = await executeQueryAndGetMetadata(
    connection,
    query
  );
  const affectedRows = result.affectedRows;

  logRecursiveQueryProgress(affectedRows, counter, limit);

  if (affectedRows == limit) {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    await executeQueryUntilAffectedRowsAreOverLimit(
      connection,
      query,
      limit,
      counter + 1
    );
  }

  function logRecursiveQueryProgress(affectedRows, counter, limit) {
    const totalProcessedRows =
      affectedRows == limit
        ? limit * counter
        : limit * (counter - 1) + affectedRows;
    console.log(
      `Pass ${counter}: Processed ${totalProcessedRows} rows so far.`
    );
  }
};

const insertInBatches = async (connection, query, data, batchSize = 1000) => {
  const totalRows = data.length;
  const totalBatches = Math.ceil(totalRows / batchSize);
  console.log(`Inserting ${totalRows} rows in ${totalBatches} batches`);

  for (let i = 0; i < totalRows; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    try {
      await executeQuery(connection, query, [batch]);

      const completedBatches = Math.ceil((i + batchSize) / batchSize);
      logProgress(completedBatches, totalBatches);
    } catch (error) {
      console.error("Error inserting batch:", error);
    }
  }
};

const logProgress = (completedBatches, totalBatches) => {
  const progressThreshold = Math.ceil(totalBatches / 10);
  if (
    completedBatches % progressThreshold === 0 ||
    completedBatches === totalBatches
  ) {
    console.log(
      `Completed ${completedBatches} of ${totalBatches} batches (${Math.round(
        (completedBatches / totalBatches) * 100
      )}%)`
    );
  }
};

const useConnections = async (configs, callback) => {
  const connections = configs.map((config) => createConnection(config));
  try {
    await callback(...connections);
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    connections.forEach((connection) => connection.end());
  }
};

module.exports = {
  createConnection,
  executeQuery,
  executeQueryAndGetMetadata,
  executeQueryUntilAffectedRowsAreOverLimit,
  insertInBatches,
  useConnections,
};
