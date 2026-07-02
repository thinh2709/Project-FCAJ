const { redisPrimary } = require('../config/redis');
const { RateLimitError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Redis-based rate limiter middleware
 * Sliding window counter using Redis INCR + EXPIRE
 *
 * @param {Object} options
 * @param {number} options.maxRequests - Max requests per window (default: 100)
 * @param {number} options.windowSeconds - Window duration in seconds (default: 60)
 * @param {string} options.keyPrefix - Redis key prefix (default: 'ratelimit')
 */
const rateLimiter = (options = {}) => {
  const {
    maxRequests = 100,
    windowSeconds = 60,
    keyPrefix = 'ratelimit',
  } = options;

  return async (req, res, next) => {
    try {
      const ip = req.ip || req.connection.remoteAddress;
      const endpoint = req.route ? req.route.path : req.path;
      const key = `${keyPrefix}:${ip}:${endpoint}`;

      const current = await redisPrimary.incr(key);

      if (current === 1) {
        await redisPrimary.expire(key, windowSeconds);
      }

      // Set rate limit headers
      res.set('X-RateLimit-Limit', String(maxRequests));
      res.set('X-RateLimit-Remaining', String(Math.max(0, maxRequests - current)));

      if (current > maxRequests) {
        const ttl = await redisPrimary.ttl(key);
        res.set('Retry-After', String(ttl > 0 ? ttl : windowSeconds));
        logger.warn('Rate limit exceeded', { ip, endpoint, current });
        return next(new RateLimitError());
      }

      next();
    } catch (error) {
      // If Redis is down, allow the request through (fail open)
      logger.error('Rate limiter error', { error: error.message });
      next();
    }
  };
};

module.exports = rateLimiter;
