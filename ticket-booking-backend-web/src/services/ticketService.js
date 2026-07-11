const db = require('../config/database');
const cacheService = require('./cacheService');
const logger = require('../utils/logger');
const { TicketsUnavailableError, NotFoundError, BookingExpiredError, AppError } = require('../utils/errors');

/**
 * CRITICAL: Atomic ticket reservation flow
 *
 * 1. For each ticket, try to acquire Redis lock (SET NX)
 * 2. If ALL locks acquired → DB transaction → create booking
 * 3. If ANY lock fails → release all acquired locks → return error
 */
const reserveTickets = async (userId, matchId, ticketRequests, queueToken = null) => {
  const acquiredLocks = [];
  const ticketIds = [];

  try {
    // Step 1: Look up ticket IDs and try to acquire Redis locks
    for (const ticketReq of ticketRequests) {
      // Find the ticket in DB
      const ticketResult = await db.query(
        `SELECT id, price, status FROM tickets
         WHERE match_id = $1 AND seat_zone = $2 AND seat_number = $3`,
        [matchId, ticketReq.zone, ticketReq.seatNumber]
      );

      if (ticketResult.rows.length === 0) {
        throw new TicketsUnavailableError([`${ticketReq.zone}-${ticketReq.seatNumber}`]);
      }

      const ticket = ticketResult.rows[0];

      if (ticket.status !== 'available') {
        throw new TicketsUnavailableError([`${ticketReq.zone}-${ticketReq.seatNumber}`]);
      }

      // Try to acquire Redis lock
      const locked = await cacheService.acquireLock(ticket.id, userId);

      if (!locked) {
        throw new TicketsUnavailableError([`${ticketReq.zone}-${ticketReq.seatNumber}`]);
      }

      acquiredLocks.push({ ticketId: ticket.id, zone: ticketReq.zone });
      ticketIds.push({ id: ticket.id, price: ticket.price, zone: ticketReq.zone });
    }

    // Step 2: All locks acquired — start DB transaction
    const client = await db.getClient();
    let booking;

    try {
      await client.query('BEGIN');

      // Calculate total amount including 5% service fee and 10% VAT
      const rawTotal = ticketIds.reduce((sum, t) => sum + parseFloat(t.price), 0);
      const serviceFee = rawTotal * 0.05;
      const vat = rawTotal * 0.10;
      const totalAmount = Math.round(rawTotal + serviceFee + vat);
      
      const lockTTL = parseInt(process.env.RESERVATION_TIMEOUT_MINUTES || 10) * 60;
      const reservedUntil = new Date(Date.now() + lockTTL * 1000);

      // Verify queueToken has not been used to create a booking already (double-booking protection)
      if (queueToken) {
        const existingBooking = await client.query(
          'SELECT id FROM bookings WHERE queue_token = $1 LIMIT 1',
          [queueToken]
        );
        if (existingBooking.rows.length > 0) {
          throw new AppError('TOKEN_ALREADY_USED', 'Lượt xếp hàng này đã được sử dụng để tạo một đơn đặt vé trước đó.', 400);
        }
      }

      // Create booking
      const bookingResult = await client.query(
        `INSERT INTO bookings (user_id, match_id, total_amount, status, payment_status, queue_token)
         VALUES ($1, $2, $3, 'pending', 'pending', $4)
         RETURNING *`,
        [userId, matchId, totalAmount, queueToken]
      );
      booking = bookingResult.rows[0];

      // Update tickets to reserved and create booking items
      for (const ticket of ticketIds) {
        await client.query(
          `UPDATE tickets SET status = 'reserved', reserved_until = $1, reserved_by = $2
           WHERE id = $3 AND status = 'available'`,
          [reservedUntil, userId, ticket.id]
        );

        await client.query(
          `INSERT INTO booking_items (booking_id, ticket_id, price)
           VALUES ($1, $2, $3)`,
          [booking.id, ticket.id, ticket.price]
        );
      }

      await client.query('COMMIT');

      // Step 3: Decrement Redis inventory counters
      const zoneCounts = {};
      for (const ticket of ticketIds) {
        zoneCounts[ticket.zone] = (zoneCounts[ticket.zone] || 0) + 1;
      }
      for (const [zone, count] of Object.entries(zoneCounts)) {
        await cacheService.decrementInventory(matchId, zone, count);
      }

      logger.info('Tickets reserved successfully', {
        bookingId: booking.id,
        userId,
        matchId,
        ticketCount: ticketIds.length,
        totalAmount,
      });

      return {
        bookingId: booking.id,
        reservedUntil,
        totalAmount,
        tickets: ticketIds.map((t) => t.id),
      };
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    // Step 4: If anything fails, release all acquired locks
    for (const lock of acquiredLocks) {
      try {
        await cacheService.releaseLock(lock.ticketId, userId);
      } catch (releaseErr) {
        logger.error('Failed to release lock during rollback', {
          ticketId: lock.ticketId,
          error: releaseErr.message,
        });
      }
    }
    throw error;
  }
};

/**
 * Release tickets from a booking (cancel/expire)
 */
const releaseTickets = async (bookingId, userId) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Get booking items
    const itemsResult = await client.query(
      `SELECT bi.ticket_id, t.seat_zone, t.match_id
       FROM booking_items bi
       JOIN tickets t ON t.id = bi.ticket_id
       WHERE bi.booking_id = $1`,
      [bookingId]
    );

    const items = itemsResult.rows;

    // Update tickets back to available
    for (const item of items) {
      await client.query(
        `UPDATE tickets SET status = 'available', reserved_until = NULL, reserved_by = NULL
         WHERE id = $1`,
        [item.ticket_id]
      );

      // Release Redis lock
      try {
        await cacheService.releaseLock(item.ticket_id, userId);
      } catch (err) {
        logger.warn('Failed to release Redis lock', { ticketId: item.ticket_id });
      }
    }

    await client.query('COMMIT');

    // Increment Redis inventory counters
    if (items.length > 0) {
      const matchId = items[0].match_id;
      const zoneCounts = {};
      for (const item of items) {
        zoneCounts[item.seat_zone] = (zoneCounts[item.seat_zone] || 0) + 1;
      }
      for (const [zone, count] of Object.entries(zoneCounts)) {
        await cacheService.incrementInventory(matchId, zone, count);
      }
    }

    logger.info('Tickets released', { bookingId, ticketCount: items.length });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get available seats for a match by zone
 */
const getAvailableSeats = async (matchId) => {
  // Try cache first
  const cached = await cacheService.getInventory(matchId);
  if (cached && Object.keys(cached).length > 0) {
    return cached;
  }

  // Fallback to DB
  const result = await db.query(
    `SELECT seat_zone, COUNT(*) as available_count
     FROM tickets
     WHERE match_id = $1 AND status = 'available'
     GROUP BY seat_zone
     ORDER BY seat_zone`,
    [matchId]
  );

  // Cache the result
  const inventoryMap = {};
  for (const row of result.rows) {
    inventoryMap[`zone:${row.seat_zone}`] = String(row.available_count);
  }

  if (Object.keys(inventoryMap).length > 0) {
    await cacheService.setInventory(matchId, inventoryMap);
  }

  return inventoryMap;
};

/**
 * Get detailed seat map for a match
 */
const getSeatMap = async (matchId) => {
  const result = await db.query(
    `SELECT id, seat_zone, seat_number, price, status
     FROM tickets
     WHERE match_id = $1
     ORDER BY seat_zone, seat_number`,
    [matchId]
  );

  // Group by zone
  const seatMap = {};
  for (const row of result.rows) {
    if (!seatMap[row.seat_zone]) {
      seatMap[row.seat_zone] = [];
    }
    seatMap[row.seat_zone].push({
      id: row.id,
      seatNumber: row.seat_number,
      price: row.price,
      status: row.status,
    });
  }

  return seatMap;
};

module.exports = {
  reserveTickets,
  releaseTickets,
  getAvailableSeats,
  getSeatMap,
};
