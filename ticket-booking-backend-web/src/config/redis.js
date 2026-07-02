const Redis = require('ioredis');
const logger = require('../utils/logger');

const retryStrategy = (times) => {
  const delay = Math.min(times * 200, 5000);
  logger.warn(`Redis reconnecting... attempt ${times}, delay ${delay}ms`);
  return delay;
};

const commonOptions = {
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  retryStrategy,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
};

// Primary (write operations)
const redisPrimary = new Redis({
  ...commonOptions,
  host: process.env.REDIS_PRIMARY_HOST,
});

// Reader (read operations)
const redisReader = new Redis({
  ...commonOptions,
  host: process.env.REDIS_READER_HOST || process.env.REDIS_PRIMARY_HOST,
});

redisPrimary.on('connect', () => logger.info('Redis primary connected'));
redisPrimary.on('error', (err) => logger.error('Redis primary error', { error: err.message }));

redisReader.on('connect', () => logger.info('Redis reader connected'));
redisReader.on('error', (err) => logger.error('Redis reader error', { error: err.message }));

/**
 * Connect both Redis clients
 */
const connect = async () => {
  await Promise.all([
    redisPrimary.connect(),
    redisReader.connect(),
  ]);
};

/**
 * Check Redis connectivity
 */
const healthCheck = async () => {
  try {
    const result = await redisPrimary.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
};

/**
 * Gracefully close both connections
 */
const close = async () => {
  await Promise.all([
    redisPrimary.quit(),
    redisReader.quit(),
  ]);
  logger.info('Redis connections closed');
};

module.exports = {
  redisPrimary,
  redisReader,
  connect,
  healthCheck,
  close,
};
