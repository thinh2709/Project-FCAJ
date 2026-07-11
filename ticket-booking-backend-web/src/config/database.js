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

const fs = require('fs');
const path = require('path');

/**
 * Run database migrations
 */
const runMigrations = async () => {
  try {
    logger.info('Running database migrations...');
    
    // 1. Create base tables from init.sql if they don't exist
    try {
      const initSqlPath = path.join(__dirname, '../../sql/init.sql');
      if (fs.existsSync(initSqlPath)) {
        const initSql = fs.readFileSync(initSqlPath, 'utf8');
        logger.info('Executing init.sql to create base tables...');
        await query(initSql);
      } else {
        logger.warn(`init.sql not found at ${initSqlPath}`);
      }
    } catch (fsError) {
      logger.error('Failed to read or execute init.sql', { error: fsError.message });
      throw fsError;
    }

    // 2. Run specific schema alterations
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

    // Tự động dọn dẹp các trận đấu trùng lặp (nếu có) trước khi tạo unique index để tránh lỗi migration
    await query(`
      DELETE FROM matches a USING matches b 
      WHERE a.id > b.id 
        AND a.team_a = b.team_a 
        AND COALESCE(a.team_b, '') = COALESCE(b.team_b, '') 
        AND a.match_date = b.match_date;
    `);

    // Tạo Unique Index chống trùng lặp trận đấu (hỗ trợ cả các trận đấu solo/concert có team_b là NULL)
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_unique_event 
      ON matches (team_a, COALESCE(team_b, ''), match_date);
    `);

    // 3. Tự động chạy seed.sql đi kèm giống hệt như init.sql
    try {
      const seedSqlPath = path.join(__dirname, '../../sql/seed.sql');
      if (fs.existsSync(seedSqlPath)) {
        logger.info('Executing seed.sql to populate initial events...');
        const seedSql = fs.readFileSync(seedSqlPath, 'utf8');
        await query(seedSql);
        logger.info('Database seeded/checked successfully.');
      } else {
        logger.warn(`seed.sql not found at ${seedSqlPath}`);
      }
    } catch (seedError) {
      logger.error('Failed to execute seed.sql during migration', { error: seedError.message });
    }

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
