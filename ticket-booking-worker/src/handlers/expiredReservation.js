const db = require('../config/database');
const redis = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Handle expired reservation cleanup
 * Releases tickets back to available if booking is still pending
 */
async function handleExpiredReservation(data) {
  const { bookingId, ticketIds, matchId } = data;

  logger.info('Processing expired reservation', { bookingId });

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Check if booking is still pending (might have been paid in the meantime)
    const booking = await client.query(
      'SELECT * FROM bookings WHERE id = $1 AND status = $2 FOR UPDATE',
      [bookingId, 'pending']
    );

    if (booking.rows.length === 0) {
      logger.info('Booking no longer pending, skipping', { bookingId });
      await client.query('COMMIT');
      return;
    }

    // Cancel booking
    await client.query(
      `UPDATE bookings 
       SET status = 'cancelled', 
           updated_at = NOW()
       WHERE id = $1`,
      [bookingId]
    );

    // Release tickets
    await client.query(
      `UPDATE tickets 
       SET status = 'available', 
           reserved_by = NULL,
           reserved_until = NULL
       WHERE id = ANY($1)`,
      [ticketIds]
    );

    // Update Redis inventory
    const tickets = await client.query(
      'SELECT seat_zone FROM tickets WHERE id = ANY($1)',
      [ticketIds]
    );

    for (const ticket of tickets.rows) {
      await redis.hincrby(
        `tickets:inventory:${matchId}`,
        `zone:${ticket.seat_zone}`,
        1
      );
    }

    // Clear Redis locks
    await Promise.all(
      ticketIds.map((id) => redis.del(`tickets:lock:${id}`))
    );

    await client.query('COMMIT');

    logger.info('Reservation expired and cleaned up', { bookingId });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { handleExpiredReservation };
