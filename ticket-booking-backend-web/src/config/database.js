const { Pool } = require('pg');
const logger = require('../utils/logger');

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  min: 5,
  max: 20,
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
 * Run database migrations
 */
const runMigrations = async () => {
  try {
    logger.info('Running database migrations...');
    await query(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS queue_token VARCHAR(32);
    `);
    
    // Clean up duplicate queue_tokens by keeping only the first one and setting others to NULL
    await query(`
      UPDATE bookings 
      SET queue_token = NULL 
      WHERE id NOT IN (
        SELECT MIN(id::text)::uuid 
        FROM bookings 
        WHERE queue_token IS NOT NULL 
        GROUP BY queue_token
      ) AND queue_token IS NOT NULL;
    `);

    await query(`
      DROP INDEX IF EXISTS idx_bookings_queue_token;
    `);
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_queue_token_unique ON bookings(queue_token) WHERE queue_token IS NOT NULL;
    `);

    // Performance Indexes for high-concurrency ticket booking
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_match_zone_status ON tickets(match_id, seat_zone, status);
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_reserved_until ON tickets(reserved_until) WHERE reserved_until IS NOT NULL;
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_status_created_at ON bookings(status, created_at) WHERE status = 'pending';
    `);

    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Database migration failed', { error: error.message });
    // Don't throw error to crash the app if this fails due to lock/permissions (optional check)
    // but in our case, crashing is safer. Let's rethrow.
    throw error;
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
  runMigrations,
};
