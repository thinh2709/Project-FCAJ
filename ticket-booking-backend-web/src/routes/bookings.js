const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const ticketService = require('../services/ticketService');
const bookingService = require('../services/bookingService');
const notificationService = require('../services/notificationService');
const queueService = require('../services/queueService');
const db = require('../config/database');
const { validate, validateQuery, reserveTicketsSchema, paginationSchema } = require('../utils/validators');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * POST /api/bookings/reserve
 * Reserve tickets (lock in Redis, create pending booking)
 * Requires valid Queue Token and active Booking Session.
 * Rate limited: max 5 reservations per minute per user
 */
router.post(
  '/reserve',
  auth,
  rateLimiter({ maxRequests: 5, windowSeconds: 60, keyPrefix: 'ratelimit:reserve' }),
  validate(reserveTicketsSchema),
  async (req, res, next) => {
    try {
      const { matchId, tickets, queueToken, sessionId } = req.body;

      // Validate Booking Session (queue token must be verified and session active)
      const sessionCheck = await queueService.validateBookingSession(matchId, queueToken);
      if (!sessionCheck.valid) {
        throw new ForbiddenError(sessionCheck.reason || 'Queue Token không hợp lệ hoặc đã hết hạn.');
      }

      // Get user ID from DB (need the local DB user ID, not cognito sub)
      let userId = req.user.userId;
      if (!userId) {
        const userResult = await db.query(
          'SELECT id FROM users WHERE cognito_sub = $1',
          [req.user.cognitoSub]
        );
        if (userResult.rows.length === 0) {
          throw new NotFoundError('User profile. Please sync your profile first.');
        }
        userId = userResult.rows[0].id;
      }

      const result = await ticketService.reserveTickets(userId, matchId, tickets, queueToken);

      // Send notification (non-blocking)
      notificationService.notifyBookingCreated({
        id: result.bookingId,
        total_amount: result.totalAmount,
        user_id: userId,
      }).catch(() => {});

      res.status(201).json({
        success: true,
        data: {
          bookingId: result.bookingId,
          reservedUntil: result.reservedUntil,
          totalAmount: result.totalAmount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/bookings/:id
 * Get booking details
 */
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get user ID
    let userId = req.user.userId;
    if (!userId) {
      const userResult = await db.query(
        'SELECT id FROM users WHERE cognito_sub = $1',
        [req.user.cognitoSub]
      );
      if (userResult.rows.length === 0) {
        throw new NotFoundError('User profile');
      }
      userId = userResult.rows[0].id;
    }

    const booking = await bookingService.getBooking(id, userId);

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/bookings
 * List user's bookings with pagination
 */
router.get('/', auth, validateQuery(paginationSchema), async (req, res, next) => {
  try {
    const { page, limit } = req.query;

    // Get user ID
    let userId = req.user.userId;
    if (!userId) {
      const userResult = await db.query(
        'SELECT id FROM users WHERE cognito_sub = $1',
        [req.user.cognitoSub]
      );
      if (userResult.rows.length === 0) {
        throw new NotFoundError('User profile');
      }
      userId = userResult.rows[0].id;
    }

    const result = await bookingService.getUserBookings(userId, page, limit);

    res.status(200).json({
      success: true,
      data: result.bookings,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/bookings/:id
 * Cancel booking (release tickets)
 */
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get user ID
    let userId = req.user.userId;
    if (!userId) {
      const userResult = await db.query(
        'SELECT id FROM users WHERE cognito_sub = $1',
        [req.user.cognitoSub]
      );
      if (userResult.rows.length === 0) {
        throw new NotFoundError('User profile');
      }
      userId = userResult.rows[0].id;
    }

    const result = await bookingService.cancelBooking(id, userId);

    // Send notification (non-blocking)
    notificationService.notifyBookingCancelled({ id, user_id: userId }).catch(() => {});

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
