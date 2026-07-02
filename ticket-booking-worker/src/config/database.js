const { Pool } = require('pg');
const logger = require('../utils/logger');

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// LUÔN LUÔN bật SSL nếu URL kết nối chỉ tới AWS RDS (bất kể NODE_ENV)
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('rds.amazonaws.com')) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err.message, stack: err.stack });
});

pool.on('connect', () => {
  logger.info('New database connection established');
});

/**
 * Execute a query with optional parameters
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executed', { text: text.substring(0, 100), duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Query error', { text: text.substring(0, 100), error: error.message });
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 */
const getClient = async () => {
  const client = await pool.connect();
  return client;
};

/**
 * Check database connectivity
 */
const healthCheck = async () => {
  try {
    const result = await pool.query('SELECT 1');
    return result.rows.length > 0;
  } catch (error) {
    logger.error('Database health check error', { error: error.message, stack: error.stack });
    return false;
  }
};

/**
 * Gracefully close the pool
 */
const close = async () => {
  await pool.end();
  logger.info('Database pool closed');
};

module.exports = {
  pool,
  query,
  getClient,
  healthCheck,
  close,
};
