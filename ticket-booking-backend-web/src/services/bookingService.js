const db = require('../config/database');
const ticketService = require('./ticketService');
const logger = require('../utils/logger');
const { NotFoundError, BookingExpiredError, AppError } = require('../utils/errors');

/**
 * Get a single booking by ID (with items)
 */
const getBooking = async (bookingId, userId = null) => {
  let queryText = `
    SELECT b.*,
           m.team_a, m.team_b, m.match_date, m.venue
    FROM bookings b
    JOIN matches m ON m.id = b.match_id
    WHERE b.id = $1
  `;
  const params = [bookingId];

  // If userId is provided, ensure the booking belongs to the user
  if (userId) {
    queryText += ' AND b.user_id = $2';
    params.push(userId);
  }

  const result = await db.query(queryText, params);

  if (result.rows.length === 0) {
    throw new NotFoundError('Booking');
  }

  const booking = result.rows[0];

  // Get booking items
  const itemsResult = await db.query(
    `SELECT bi.*, t.seat_zone, t.seat_number
     FROM booking_items bi
     JOIN tickets t ON t.id = bi.ticket_id
     WHERE bi.booking_id = $1`,
    [bookingId]
  );

  booking.items = itemsResult.rows;
  return booking;
};

/**
 * Get all bookings for a user with pagination
 */
const getUserBookings = async (userId, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  const countResult = await db.query(
    'SELECT COUNT(*) FROM bookings WHERE user_id = $1',
    [userId]
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await db.query(
    `SELECT b.*,
            m.team_a, m.team_b, m.match_date, m.venue
     FROM bookings b
     JOIN matches m ON m.id = b.match_id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return {
    bookings: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Cancel a booking (release tickets)
 */
const cancelBooking = async (bookingId, userId) => {
  // Verify booking exists and belongs to user
  const booking = await getBooking(bookingId, userId);

  if (booking.status === 'cancelled') {
    throw new AppError('BOOKING_ALREADY_CANCELLED', 'Booking is already cancelled', 400);
  }

  if (booking.payment_status === 'paid') {
    throw new AppError('BOOKING_PAID', 'Cannot cancel a paid booking. Please request a refund.', 400);
  }

  // Release tickets
  await ticketService.releaseTickets(bookingId, userId);

  // Update booking status
  await db.query(
    `UPDATE bookings SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1`,
    [bookingId]
  );

  // Clean up queue session and token instantly to allow next user in line
  if (booking.queue_token) {
    try {
      const queueService = require('./queueService');
      await queueService.completeBookingSession(booking.match_id, booking.queue_token);
    } catch (err) {
      logger.error('Failed to clean up queue session on booking cancellation', { bookingId, error: err.message });
    }
  }

  logger.info('Booking cancelled', { bookingId, userId });

  return { bookingId, status: 'cancelled' };
};

/**
 * Get all bookings with filters (admin)
 */
const getAllBookings = async (filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (filters.status) {
    conditions.push(`b.status = $${paramIndex++}`);
    params.push(filters.status);
  }

  if (filters.paymentStatus) {
    conditions.push(`b.payment_status = $${paramIndex++}`);
    params.push(filters.paymentStatus);
  }

  if (filters.matchId) {
    conditions.push(`b.match_id = $${paramIndex++}`);
    params.push(filters.matchId);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await db.query(
    `SELECT COUNT(*) FROM bookings b ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await db.query(
    `SELECT b.*,
            u.email, u.full_name,
            m.team_a, m.team_b, m.match_date, m.venue
     FROM bookings b
     JOIN users u ON u.id = b.user_id
     JOIN matches m ON m.id = b.match_id
     ${whereClause}
     ORDER BY b.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return {
    bookings: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Cleanup expired pending bookings
 */
const cleanupExpiredBookings = async () => {
  try {
    const timeoutMins = parseInt(process.env.RESERVATION_TIMEOUT_MINUTES || 10, 10);
    const result = await db.query(`
      SELECT id, user_id FROM bookings 
      WHERE status = 'pending' 
        AND created_at < NOW() - INTERVAL '${timeoutMins} minutes'
    `);
    
    if (result.rows.length > 0) {
      logger.info(`Found ${result.rows.length} expired bookings to cleanup.`);
      for (const row of result.rows) {
        try {
          await cancelBooking(row.id, row.user_id);
        } catch (err) {
          logger.error(`Failed to cancel expired booking ${row.id}:`, err);
        }
      }
    }
  } catch (err) {
    logger.error('Error during expired booking cleanup:', err);
  }
};

module.exports = {
  getBooking,
  getUserBookings,
  cancelBooking,
  getAllBookings,
  cleanupExpiredBookings,
};
