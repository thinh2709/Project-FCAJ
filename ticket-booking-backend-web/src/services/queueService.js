const { redisPrimary, redisReader } = require('../config/redis');
const crypto = require('crypto');
const logger = require('../utils/logger');
const db = require('../config/database');

const QUEUE_KEY = (eventId) => `queue:waitlist:${eventId}`;
const ALLOWED_KEY = (eventId) => `queue:allowed:${eventId}`;
const ALLOWED_TTL = 300; // 5 minutes to complete booking once allowed

/**
 * Prune users who have not polled within the last 15 seconds
 */
const pruneInactiveUsers = async (eventId) => {
  try {
    const now = Date.now();
    const threshold = now - 15000; // 15 seconds of inactivity

    // Get all users in the queue
    const users = await redisReader.zrange(QUEUE_KEY(eventId), 0, -1);
    if (!users || users.length === 0) return;

    // Get last active times
    const activeTimes = await redisReader.hmget(`queue:last_active:${eventId}`, ...users);
    
    const inactiveUsers = [];
    users.forEach((userId, index) => {
      const lastActive = parseInt(activeTimes[index], 10);
      if (!lastActive || lastActive < threshold) {
        inactiveUsers.push(userId);
      }
    });

    if (inactiveUsers.length > 0) {
      const multi = redisPrimary.multi();
      multi.zrem(QUEUE_KEY(eventId), ...inactiveUsers);
      multi.hdel(`queue:last_active:${eventId}`, ...inactiveUsers);
      await multi.exec();
      logger.info(`Pruned ${inactiveUsers.length} inactive users from queue for event ${eventId}`);
    }
  } catch (error) {
    logger.error('Failed to prune inactive users', { eventId, error: error.message });
  }
};

/**
 * Join the virtual queue
 */
const joinQueue = async (eventId, sessionId) => {
  try {
    const timestamp = Date.now();
    
    // Check if already allowed
    const isAllowed = await redisReader.hget(ALLOWED_KEY(eventId), sessionId);
    if (isAllowed) {
      return { status: 'GRANTED', token: isAllowed };
    }
    
    // Add to sorted set (NX: only if not exists)
    await redisPrimary.zadd(QUEUE_KEY(eventId), 'NX', timestamp, sessionId);

    // Record active timestamp
    await redisPrimary.hset(`queue:last_active:${eventId}`, sessionId, timestamp);
    
    // Get current position
    const rank = await redisReader.zrank(QUEUE_KEY(eventId), sessionId);
    return { status: 'QUEUED', position: rank + 1 };
  } catch (error) {
    logger.error('Failed to join queue', { eventId, sessionId, error: error.message });
    throw error;
  }
};

/**
 * Get current queue position or allowed status
 */
const getStatus = async (eventId, sessionId) => {
  try {
    const now = Date.now();

    // Record active timestamp
    await redisPrimary.hset(`queue:last_active:${eventId}`, sessionId, now);

    // Run pruning at most once every 10 seconds
    const pruneLock = await redisPrimary.set(`queue:prune_lock:${eventId}`, '1', 'NX', 'EX', 10);
    if (pruneLock) {
      pruneInactiveUsers(eventId).catch(err => logger.error('Pruning error', err));
    }

    // Check if already allowed
    const isAllowed = await redisReader.hget(ALLOWED_KEY(eventId), sessionId);
    
    // Get remaining tickets (Total - Sold only, ignoring reserved) with 5s cache
    let remainingTickets = await redisReader.get(`queue:remaining:${eventId}`);
    if (remainingTickets === null) {
      const dbResult = await db.query(
        `SELECT 
          COUNT(id) as total,
          COUNT(id) FILTER (WHERE status = 'sold') as sold
         FROM tickets 
         WHERE match_id = $1`, 
         [eventId]
      );
      const total = parseInt(dbResult.rows[0].total) || 0;
      const sold = parseInt(dbResult.rows[0].sold) || 0;
      remainingTickets = Math.max(0, total - sold);
      
      await redisPrimary.set(`queue:remaining:${eventId}`, remainingTickets, 'EX', 5);
    } else {
      remainingTickets = parseInt(remainingTickets, 10);
    }

    if (isAllowed) {
      return { status: 'GRANTED', token: isAllowed, remainingTickets };
    }

    const rank = await redisReader.zrank(QUEUE_KEY(eventId), sessionId);
    if (rank === null) {
      return { status: 'NOT_IN_QUEUE', remainingTickets };
    }

    return { status: 'QUEUED', position: rank + 1, remainingTickets };
  } catch (error) {
    logger.error('Failed to get queue status', { eventId, sessionId, error: error.message });
    throw error;
  }
};

/**
 * Worker function: Allow top N users from the queue to enter the booking page
 */
const allowUsers = async (eventId, count) => {
  try {
    // Get top N users (0-indexed)
    const users = await redisPrimary.zrange(QUEUE_KEY(eventId), 0, count - 1);
    if (!users || users.length === 0) return 0;

    const multi = redisPrimary.multi();
    
    users.forEach((userId) => {
      const token = crypto.randomBytes(16).toString('hex');
      // Remove from queue
      multi.zrem(QUEUE_KEY(eventId), userId);
      // Add to allowed hash map
      multi.hset(ALLOWED_KEY(eventId), userId, token);
    });
    
    // Refresh TTL for the allowed hash
    multi.expire(ALLOWED_KEY(eventId), ALLOWED_TTL);

    await multi.exec();
    logger.info(`Allowed ${users.length} users for event ${eventId}`);
    return users.length;
  } catch (error) {
    logger.error('Failed to allow users', { eventId, count, error: error.message });
    throw error;
  }
};

/**
 * Verify if a user's token is valid
 */
const verifyToken = async (eventId, sessionId, token) => {
  try {
    const storedToken = await redisReader.hget(ALLOWED_KEY(eventId), sessionId);
    return storedToken && storedToken === token;
  } catch (error) {
    logger.error('Failed to verify token', { eventId, sessionId, error: error.message });
    return false;
  }
};

/**
 * Get queue stats for admin
 */
const getQueueStats = async (eventId) => {
  try {
    const waitingUsers = await redisReader.zcard(QUEUE_KEY(eventId));
    const currentAllowedUsers = await redisReader.hlen(ALLOWED_KEY(eventId));
    return { waitingUsers, currentAllowedUsers };
  } catch (error) {
    logger.error('Failed to get queue stats for admin', { eventId, error: error.message });
    throw error;
  }
};

/**
 * Reset queue for admin
 */
const resetQueue = async (eventId) => {
  try {
    await redisPrimary.del(QUEUE_KEY(eventId));
    await redisPrimary.del(ALLOWED_KEY(eventId));
    await redisPrimary.del(`queue:remaining:${eventId}`);
    await redisPrimary.del(`queue:last_active:${eventId}`);
    await redisPrimary.del(`queue:prune_lock:${eventId}`);
    logger.info(`Reset queue for event ${eventId}`);
    return true;
  } catch (error) {
    logger.error('Failed to reset queue', { eventId, error: error.message });
    throw error;
  }
};

/**
 * Remove user from queue (manual/unload leave)
 */
const leaveQueue = async (eventId, sessionId) => {
  try {
    await redisPrimary.zrem(QUEUE_KEY(eventId), sessionId);
    await redisPrimary.hdel(`queue:last_active:${eventId}`, sessionId);
    logger.info(`User session ${sessionId} explicitly left the queue for event ${eventId}`);
    return true;
  } catch (error) {
    logger.error('Failed to leave queue', { eventId, sessionId, error: error.message });
    throw error;
  }
};

const BOOKING_SESSION_TTL = 600; // 10 minutes
const BOOKING_SESSION_KEY = (eventId, queueToken) => `booking:session:${eventId}:${queueToken}`;

/**
 * Create a Booking Session after queue token verification.
 * Transitions: GRANTED → BOOKING
 * Idempotent: returns existing session if already created (anti multi-tab).
 */
const createBookingSession = async (eventId, sessionId, queueToken) => {
  try {
    const key = BOOKING_SESSION_KEY(eventId, queueToken);

    // Check if session already exists (refresh / multi-tab protection)
    const existing = await redisReader.hgetall(key);
    if (existing && existing.status) {
      // Return existing session without creating a new one
      return {
        bookingSessionId: key,
        sessionId: existing.sessionId,
        status: existing.status,
        createdAt: existing.createdAt,
        expiredAt: existing.expiredAt,
        isExisting: true,
      };
    }

    // Verify the queue token is valid
    const isValid = await verifyToken(eventId, sessionId, queueToken);
    if (!isValid) {
      return { valid: false, reason: 'Queue Token không hợp lệ hoặc đã hết hạn.' };
    }

    // Create new Booking Session
    const now = Date.now();
    const expiredAt = now + BOOKING_SESSION_TTL * 1000;
    const sessionData = {
      sessionId,
      status: 'BOOKING',
      createdAt: String(now),
      expiredAt: String(expiredAt),
    };

    await redisPrimary.hmset(key, sessionData);
    await redisPrimary.expire(key, BOOKING_SESSION_TTL);

    logger.info('Booking session created', { eventId, sessionId, queueToken: queueToken.substring(0, 8) + '...' });

    return {
      bookingSessionId: key,
      sessionId,
      status: 'BOOKING',
      createdAt: new Date(now).toISOString(),
      expiredAt: new Date(expiredAt).toISOString(),
      isExisting: false,
    };
  } catch (error) {
    logger.error('Failed to create booking session', { eventId, sessionId, error: error.message });
    throw error;
  }
};

/**
 * Validate that a Booking Session exists and is still active.
 * Called by POST /api/bookings/reserve before allowing ticket reservation.
 */
const validateBookingSession = async (eventId, queueToken) => {
  try {
    const key = BOOKING_SESSION_KEY(eventId, queueToken);
    const session = await redisReader.hgetall(key);

    if (!session || !session.status) {
      return { valid: false, reason: 'Booking Session không tồn tại hoặc đã hết hạn.' };
    }

    if (session.status !== 'BOOKING') {
      return { valid: false, reason: `Booking Session ở trạng thái không hợp lệ: ${session.status}` };
    }

    return { valid: true, session };
  } catch (error) {
    logger.error('Failed to validate booking session', { eventId, error: error.message });
    throw error;
  }
};

/**
 * Complete a Booking Session after successful payment.
 * Transitions: BOOKING → COMPLETED
 * Invalidates the queueToken so it cannot be reused.
 */
const completeBookingSession = async (eventId, queueToken) => {
  try {
    const key = BOOKING_SESSION_KEY(eventId, queueToken);

    // Delete booking session from Redis
    await redisPrimary.del(key);

    // Invalidate the queue token (remove from allowed hash)
    // We need to find which sessionId owns this token to remove it
    const allowedData = await redisReader.hgetall(ALLOWED_KEY(eventId));
    if (allowedData) {
      for (const [sid, token] of Object.entries(allowedData)) {
        if (token === queueToken) {
          await redisPrimary.hdel(ALLOWED_KEY(eventId), sid);
          break;
        }
      }
    }

    logger.info('Booking session completed', { eventId, queueToken: queueToken.substring(0, 8) + '...' });
    return true;
  } catch (error) {
    logger.error('Failed to complete booking session', { eventId, error: error.message });
    throw error;
  }
};

module.exports = {
  joinQueue,
  getStatus,
  allowUsers,
  verifyToken,
  getQueueStats,
  resetQueue,
  leaveQueue,
  createBookingSession,
  validateBookingSession,
  completeBookingSession,
  BOOKING_SESSION_TTL,
};
