const Redis = require('ioredis');
const logger = require('../utils/logger');

// Worker chỉ cần 1 kết nối Redis (Primary) để ghi dữ liệu
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (err) => {
  logger.error('Redis error', { error: err.message });
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

/**
 * Connect to Redis
 */
const connect = async () => {
  await redis.connect();
  logger.info('Redis connection established');
};

/**
 * Check Redis connectivity
 */
const healthCheck = async () => {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
};

/**
 * Close Redis connection
 */
const close = async () => {
  await redis.quit();
  logger.info('Redis connection closed');
};

module.exports = {
  client: redis,
  connect,
  healthCheck,
  close,
  // Expose common methods for convenience
  del: (key) => redis.del(key),
  get: (key) => redis.get(key),
  set: (key, value, ...args) => redis.set(key, value, ...args),
  hset: (key, field, value) => redis.hset(key, field, value),
  hget: (key, field) => redis.hget(key, field),
  hincrby: (key, field, increment) => redis.hincrby(key, field, increment),
};
