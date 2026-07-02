const db = require('../config/database');
const redis = require('../config/redis');
const { sendToSQS } = require('../utils/sqs');
const logger = require('../utils/logger');

/**
 * Every minute: Check for expired reservations and queue cleanup jobs
 */
function startExpiryChecker() {
  const intervalMs = 60000; // 60 seconds

  setInterval(async () => {
    try {
      const timeoutMinutes = parseInt(process.env.RESERVATION_TIMEOUT_MINUTES, 10) || 10;

      const expired = await db.query(
        `SELECT b.id as booking_id, 
                b.match_id,
                ARRAY_AGG(bi.ticket_id) as ticket_ids
         FROM bookings b
         JOIN booking_items bi ON b.id = bi.booking_id
         WHERE b.status = 'pending'
           AND b.created_at < NOW() - INTERVAL '${timeoutMinutes} minutes'
         GROUP BY b.id`
      );

      if (expired.rows.length > 0) {
        logger.info(`Found ${expired.rows.length} expired reservation(s)`);
      }

      for (const booking of expired.rows) {
        logger.info('Queueing expired reservation for cleanup', {
          bookingId: booking.booking_id,
        });
        await sendToSQS({
          type: 'RESERVATION_EXPIRED',
          data: {
            bookingId: booking.booking_id,
            ticketIds: booking.ticket_ids,
            matchId: booking.match_id,
          },
        });
      }
    } catch (error) {
      logger.error('Expiry check failed', { error: error.message });
    }
  }, intervalMs);

  logger.info('Expiry checker started (runs every 60s)');
}

/**
 * Every hour: Sync Redis inventory with DB (source of truth)
 */
function startInventorySync() {
  const intervalMs = 3600000; // 1 hour

  // Run once immediately on startup
  syncInventory();

  setInterval(() => {
    syncInventory();
  }, intervalMs);

  logger.info('Inventory sync started (runs every 1 hour)');
}

async function syncInventory() {
  try {
    const matches = await db.query(
      `SELECT m.id as match_id, t.seat_zone, COUNT(*) as available
       FROM matches m
       JOIN tickets t ON m.id = t.match_id
       WHERE t.status = 'available'
         AND (t.reserved_until IS NULL OR t.reserved_until < NOW())
         AND m.status = 'upcoming'
       GROUP BY m.id, t.seat_zone`
    );

    for (const row of matches.rows) {
      await redis.hset(
        `tickets:inventory:${row.match_id}`,
        `zone:${row.seat_zone}`,
        row.available
      );
    }

    logger.info('Redis inventory synced with DB', { matchesUpdated: matches.rows.length });
  } catch (error) {
    logger.error('Inventory sync failed', { error: error.message });
  }
}

module.exports = { startExpiryChecker, startInventorySync };
