const { redisPrimary, redisReader } = require('../config/redis');
const logger = require('../utils/logger');

// TTL constants (seconds)
const TICKET_LOCK_TTL = 600;     // 10 minutes for reservation
const MATCH_CACHE_TTL = 86400;     // 24 hours (Prevents Cache Miss Storm every 5 mins)
const SESSION_CACHE_TTL = 3600;  // 1 hour

// ==================== Ticket Inventory ====================

/**
 * Get ticket inventory for a match from cache
 * Key: tickets:inventory:{matchId}
 */
const getInventory = async (matchId) => {
  try {
    const data = await redisReader.hgetall(`tickets:inventory:${matchId}`);
    return data;
  } catch (error) {
    logger.error('Failed to get inventory from cache', { matchId, error: error.message });
    return null;
  }
};

/**
 * Set ticket inventory for a match
 */
const setInventory = async (matchId, inventoryMap) => {
  try {
    const key = `tickets:inventory:${matchId}`;
    await redisPrimary.hmset(key, inventoryMap);
    await redisPrimary.expire(key, MATCH_CACHE_TTL);
  } catch (error) {
    logger.error('Failed to set inventory in cache', { matchId, error: error.message });
  }
};

/**
 * Decrement inventory count for a zone
 */
const decrementInventory = async (matchId, zone, count = 1) => {
  try {
    const result = await redisPrimary.hincrby(`tickets:inventory:${matchId}`, `zone:${zone}`, -count);
    return result;
  } catch (error) {
    logger.error('Failed to decrement inventory', { matchId, zone, error: error.message });
    throw error;
  }
};

/**
 * Increment inventory count for a zone (used when releasing tickets)
 */
const incrementInventory = async (matchId, zone, count = 1) => {
  try {
    const result = await redisPrimary.hincrby(`tickets:inventory:${matchId}`, `zone:${zone}`, count);
    return result;
  } catch (error) {
    logger.error('Failed to increment inventory', { matchId, zone, error: error.message });
    throw error;
  }
};

// ==================== Ticket Locking ====================

/**
 * Acquire lock for a ticket (SET NX with TTL)
 * Returns true if lock acquired, false otherwise
 */
const acquireLock = async (ticketId, userId) => {
  try {
    const key = `tickets:lock:${ticketId}`;
    const result = await redisPrimary.set(key, userId, 'EX', TICKET_LOCK_TTL, 'NX');
    return result === 'OK';
  } catch (error) {
    logger.error('Failed to acquire ticket lock', { ticketId, userId, error: error.message });
    throw error;
  }
};

/**
 * Release lock for a ticket
 * Only releases if the lock is held by the given userId
 */
const releaseLock = async (ticketId, userId) => {
  try {
    const key = `tickets:lock:${ticketId}`;
    // Lua script to ensure atomic check-and-delete
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await redisPrimary.eval(script, 1, key, userId);
    return result === 1;
  } catch (error) {
    logger.error('Failed to release ticket lock', { ticketId, userId, error: error.message });
    throw error;
  }
};

// ==================== Match Cache ====================

/**
 * Cache match details
 */
const cacheMatch = async (matchId, matchData) => {
  try {
    const key = `matches:${matchId}`;
    await redisPrimary.hmset(key, {
      data: JSON.stringify(matchData),
    });
    await redisPrimary.expire(key, MATCH_CACHE_TTL);
  } catch (error) {
    logger.error('Failed to cache match', { matchId, error: error.message });
  }
};

/**
 * Get cached match details
 */
const getCachedMatch = async (matchId) => {
  try {
    const raw = await redisReader.hget(`matches:${matchId}`, 'data');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    logger.error('Failed to get cached match', { matchId, error: error.message });
    return null;
  }
};

/**
 * Invalidate match cache
 */
const invalidateMatchCache = async (matchId) => {
  try {
    await redisPrimary.del(`matches:${matchId}`);
    await redisPrimary.del(`tickets:inventory:${matchId}`);
    
    // Invalidate matches:list:*
    const listKeys = await redisPrimary.keys('matches:list:*');
    if (listKeys && listKeys.length > 0) {
      await redisPrimary.del(...listKeys);
    }
  } catch (error) {
    logger.error('Failed to invalidate match cache', { matchId, error: error.message });
  }
};

/**
 * Cache paginated matches list
 */
const cacheMatchesList = async (page, limit, data) => {
  try {
    const key = `matches:list:${page}:${limit}`;
    await redisPrimary.set(key, JSON.stringify(data), 'EX', MATCH_CACHE_TTL);
  } catch (error) {
    logger.error('Failed to cache matches list', { page, limit, error: error.message });
  }
};

/**
 * Get cached matches list
 */
const getCachedMatchesList = async (page, limit) => {
  try {
    const key = `matches:list:${page}:${limit}`;
    const raw = await redisReader.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    logger.error('Failed to get cached matches list', { page, limit, error: error.message });
    return null;
  }
};

// ==================== User Session Cache ====================

/**
 * Cache user session data
 */
const cacheUserSession = async (cognitoSub, sessionData) => {
  try {
    const key = `users:session:${cognitoSub}`;
    await redisPrimary.hmset(key, sessionData);
    await redisPrimary.expire(key, SESSION_CACHE_TTL);
  } catch (error) {
    logger.error('Failed to cache user session', { cognitoSub, error: error.message });
  }
};

/**
 * Get cached user session
 */
const getCachedUserSession = async (cognitoSub) => {
  try {
    const data = await redisReader.hgetall(`users:session:${cognitoSub}`);
    return data && Object.keys(data).length > 0 ? data : null;
  } catch (error) {
    logger.error('Failed to get cached user session', { cognitoSub, error: error.message });
    return null;
  }
};

module.exports = {
  // Inventory
  getInventory,
  setInventory,
  decrementInventory,
  incrementInventory,
  // Locking
  acquireLock,
  releaseLock,
  // Match cache
  cacheMatch,
  getCachedMatch,
  invalidateMatchCache,
  cacheMatchesList,
  getCachedMatchesList,
  // Session cache
  cacheUserSession,
  getCachedUserSession,
  // Constants
  TICKET_LOCK_TTL,
  MATCH_CACHE_TTL,
  SESSION_CACHE_TTL,
};
