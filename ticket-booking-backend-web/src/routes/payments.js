const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const paymentService = require('../services/paymentService');
const bookingService = require('../services/bookingService');
const db = require('../config/database');
const { validate, createMoMoPaymentSchema } = require('../utils/validators');
const { NotFoundError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * POST /api/payments/momo/create
 * Create MoMo payment request
 */
router.post('/momo/create', auth, validate(createMoMoPaymentSchema), async (req, res, next) => {
  try {
    const { bookingId, requestType } = req.body;

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

    // Get booking and verify ownership
    const booking = await bookingService.getBooking(bookingId, userId);

    // Validate booking status
    if (booking.status !== 'pending') {
      throw new AppError('INVALID_BOOKING_STATUS', 'Booking is not in pending status', 400);
    }

    if (booking.payment_status === 'paid') {
      throw new AppError('ALREADY_PAID', 'Booking has already been paid', 400);
    }

    // Block re-payment: only allow ONE payment attempt per booking
    const existingPayment = await db.query(
      `SELECT id FROM payment_logs WHERE booking_id = $1 AND status = 'initiated' LIMIT 1`,
      [bookingId]
    );
    if (existingPayment.rows.length > 0) {
      throw new AppError('PAYMENT_ALREADY_INITIATED', 'Chỉ được thanh toán 1 lần ngay sau khi đặt vé. Vui lòng đặt vé mới.', 400);
    }

    const result = await paymentService.createMoMoPayment(booking, requestType);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET/POST /api/payments/momo/ipn
 * MoMo IPN webhook
 */
router.all('/momo/ipn', async (req, res, next) => {
  try {
    const ipnData = req.method === 'POST' ? req.body : req.query;
    logger.info('MoMo IPN received', { orderId: ipnData.orderId });

    const result = await paymentService.handleMoMoIPN(ipnData);

    // MoMo expects 200 OK
    res.status(200).json(result);
  } catch (error) {
    logger.error('MoMo IPN processing error', { error: error.message });
    res.status(200).json({ status: 'failed', message: 'Unknown error' });
  }
});

/**
 * GET /api/payments/momo/check/:bookingId
 * Check payment status
 */
router.get('/momo/check/:bookingId', auth, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { orderId } = req.query;

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

    const result = await paymentService.checkPaymentStatus(bookingId, userId, orderId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
