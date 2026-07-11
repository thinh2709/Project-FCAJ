const db = require('../config/database');
const redis = require('../config/redis');
const { sendToSQS } = require('../utils/sqs');
const logger = require('../utils/logger');

/**
 * Handle MoMo IPN (Instant Payment Notification)
 * CRITICAL: Must be idempotent - safe to process same message multiple times
 */
async function handleMoMoPayment(ipnData) {
  const { orderId: fullOrderId, resultCode, transId, amount } = ipnData;
  const orderId = fullOrderId.split('_')[0]; // Extract real booking ID from 'uuid_timestamp'

  logger.info('Processing MoMo IPN', { fullOrderId, orderId, resultCode, transId, amount });

  // 1. Get booking with lock
  const booking = await db.query(
    'SELECT * FROM bookings WHERE id = $1 FOR UPDATE',
    [orderId]
  );
  if (!booking.rows[0]) {
    throw new Error(`Booking not found: ${orderId}`);
  }

  const bookingData = booking.rows[0];

  // 2. Idempotency check - already processed?
  if (bookingData.status !== 'pending' && bookingData.status !== 'cancelled') {
    logger.info('IPN already processed for booking, skipping', { orderId, status: bookingData.status });
    return;
  }

  // Removed redundant query since we moved it up

  // 3. Verify amount matches
  if (Math.round(parseFloat(bookingData.total_amount)) !== amount) {
    throw new Error(`Amount mismatch: expected ${bookingData.total_amount}, got ${amount}`);
  }

  // 4. Start transaction
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Prevent resurrecting a cancelled booking (e.g. late payment after timeout)
    if (bookingData.status === 'cancelled' && resultCode === 0) {
      logger.error('Received successful MoMo payment for a CANCELLED booking. Needs refund.', { orderId, transId, amount });
      
      await client.query(
        `INSERT INTO payment_logs 
         (booking_id, provider, transaction_id, amount, status, raw_response)
         VALUES ($1, 'momo', $2, $3, 'refund_needed', $4)`,
        [orderId, transId, amount, JSON.stringify(ipnData)]
      );
      
      await client.query('COMMIT');
      return; // Stop processing, do NOT resurrect tickets
    }

    if (resultCode === 0) {
      // ========== SUCCESS - Confirm booking ==========

      // Update booking status
      await client.query(
        `UPDATE bookings 
         SET status = 'confirmed', 
             payment_status = 'paid',
             transaction_id = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [transId, orderId]
      );

      // Update tickets to 'sold'
      await client.query(
        `UPDATE tickets 
         SET status = 'sold', 
             reserved_until = NULL
         WHERE id IN (
             SELECT ticket_id FROM booking_items WHERE booking_id = $1
         )`,
        [orderId]
      );

      // Get ticket IDs for Redis cleanup
      const ticketIds = await client.query(
        'SELECT ticket_id FROM booking_items WHERE booking_id = $1',
        [orderId]
      );

      // Clear Redis locks
      await Promise.all(
        ticketIds.rows.map((row) => redis.del(`tickets:lock:${row.ticket_id}`))
      );

      // Log successful payment
      await client.query(
        `INSERT INTO payment_logs 
         (booking_id, provider, transaction_id, amount, status, raw_response)
         VALUES ($1, 'momo', $2, $3, 'success', $4)`,
        [orderId, transId, amount, JSON.stringify(ipnData)]
      );

      await client.query('COMMIT');

      logger.info('Booking confirmed', { orderId });

      // Queue async tasks (don't block)
      await sendToSQS({
        type: 'SEND_NOTIFICATION',
        data: {
          userId: bookingData.user_id,
          type: 'BOOKING_CONFIRMED',
          bookingId: orderId,
          channels: ['email'],
        },
      });

      await sendToSQS({
        type: 'GENERATE_TICKET_PDF',
        data: { bookingId: orderId },
      });
    } else {
      // ========== FAILED - Release tickets ==========

      await client.query(
        `UPDATE bookings 
         SET payment_status = 'failed',
             updated_at = NOW()
         WHERE id = $1`,
        [orderId]
      );

      // Get tickets to release
      const tickets = await client.query(
        `SELECT t.id, t.seat_zone 
         FROM tickets t
         JOIN booking_items bi ON t.id = bi.ticket_id
         WHERE bi.booking_id = $1`,
        [orderId]
      );

      // Release tickets back to available
      await client.query(
        `UPDATE tickets 
         SET status = 'available', 
             reserved_by = NULL,
             reserved_until = NULL
         WHERE id IN (
             SELECT ticket_id FROM booking_items WHERE booking_id = $1
         )`,
        [orderId]
      );

      // Update Redis inventory
      for (const ticket of tickets.rows) {
        await redis.hincrby(
          `tickets:inventory:${bookingData.match_id}`,
          `zone:${ticket.seat_zone}`,
          1
        );
        await redis.del(`tickets:lock:${ticket.id}`);
      }

      // Log failed payment
      await client.query(
        `INSERT INTO payment_logs 
         (booking_id, provider, transaction_id, amount, status, raw_response)
         VALUES ($1, 'momo', $2, $3, 'failed', $4)`,
        [orderId, transId, amount, JSON.stringify(ipnData)]
      );

      await client.query('COMMIT');

      logger.info('Payment failed, tickets released', { orderId });

      // Notify user of failure
      await sendToSQS({
        type: 'SEND_NOTIFICATION',
        data: {
          userId: bookingData.user_id,
          type: 'PAYMENT_FAILED',
          bookingId: orderId,
          channels: ['email'],
        },
      });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { handleMoMoPayment };
