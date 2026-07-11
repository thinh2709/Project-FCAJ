const crypto = require('crypto');
const axios = require('axios');
const db = require('../config/database');
const { sendToQueue } = require('../config/aws');
const logger = require('../utils/logger');
const { PaymentError, NotFoundError, AppError } = require('../utils/errors');
const queueService = require('./queueService');

function generateMoMoSignature(rawData, secretKey) {
  return crypto.createHmac('sha256', secretKey).update(rawData).digest('hex');
}

/**
 * Create MoMo payment request
 */
const createMoMoPayment = async (booking, requestType = 'captureWallet') => {
  const requestId = `${booking.id}_${Date.now()}`;
  const orderId = requestId;
  const amount = Math.round(parseFloat(booking.total_amount));
  const orderInfo = `Đặt vé #${booking.id}`;
  const extraData = Buffer.from(JSON.stringify({ bookingId: booking.id })).toString('base64');
  const orderExpireTime = 5; // MoMo page expires in 5 minutes

  const rawSignature = `accessKey=${process.env.MOMO_ACCESS_KEY}&amount=${amount}&extraData=${extraData}&ipnUrl=${process.env.MOMO_IPN_URL}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${process.env.MOMO_PARTNER_CODE}&redirectUrl=${process.env.MOMO_REDIRECT_URL}&requestId=${requestId}&requestType=${requestType}`;

  const signature = generateMoMoSignature(rawSignature, process.env.MOMO_SECRET_KEY);

  const requestBody = {
    partnerCode: process.env.MOMO_PARTNER_CODE,
    accessKey: process.env.MOMO_ACCESS_KEY,
    requestId,
    amount,
    orderId,
    orderInfo,
    orderExpireTime,
    redirectUrl: process.env.MOMO_REDIRECT_URL,
    ipnUrl: process.env.MOMO_IPN_URL,
    extraData,
    requestType,
    signature,
    lang: 'vi',
  };

  // Log the request
  await db.query(
    `INSERT INTO payment_logs (booking_id, provider, amount, status, raw_request)
     VALUES ($1, 'momo', $2, 'initiated', $3)`,
    [booking.id, amount, JSON.stringify(requestBody)]
  );

  try {
    const response = await axios.post(
      `${process.env.MOMO_ENDPOINT}/create`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );

    const momoResponse = response.data;

    // Log the response
    await db.query(
      `UPDATE payment_logs SET raw_response = $1, status = $2
       WHERE id = (
         SELECT id FROM payment_logs 
         WHERE booking_id = $3 AND status = 'initiated'
         ORDER BY created_at DESC LIMIT 1
       )`,
      [JSON.stringify(momoResponse), momoResponse.resultCode === 0 ? 'created' : 'failed', booking.id]
    );

    if (momoResponse.resultCode !== 0) {
      throw new PaymentError(`MoMo payment creation failed: ${momoResponse.message}`);
    }

    // Update booking with payment method
    await db.query(
      `UPDATE bookings SET payment_method = 'momo', updated_at = NOW()
       WHERE id = $1`,
      [booking.id]
    );

    logger.info('MoMo payment created', {
      bookingId: booking.id,
      amount,
      payUrl: momoResponse.payUrl,
    });

    return {
      payUrl: momoResponse.payUrl,
      qrCodeUrl: momoResponse.qrCodeUrl,
      deeplink: momoResponse.deeplink,
    };
  } catch (error) {
    if (error instanceof PaymentError) throw error;
    const moMoError = error.response ? error.response.data : error.message;
    logger.error('MoMo API call failed', { error: moMoError, bookingId: booking.id });
    throw new PaymentError('Failed to connect to MoMo payment gateway');
  }
};

function verifyMoMoSignature(ipnData) {
  const { amount, extraData, message, orderId, orderInfo, orderType,
    partnerCode, payType, requestId, responseTime, resultCode, transId } = ipnData;

  // Use server-side accessKey, not the one from IPN data
  const accessKey = process.env.MOMO_ACCESS_KEY;

  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

  const expectedSignature = generateMoMoSignature(rawSignature, process.env.MOMO_SECRET_KEY);

  return ipnData.signature === expectedSignature;
}

/**
 * Handle MoMo IPN webhook callback
 */
const handleMoMoIPN = async (ipnData, bypassSignature = false) => {
  // Step 1: Verify signature (CRITICAL)
  if (!bypassSignature && !verifyMoMoSignature(ipnData)) {
    logger.error('Invalid MoMo IPN signature', { orderId: ipnData.orderId });
    throw new AppError('INVALID_SIGNATURE', 'MoMo signature verification failed');
  }

  const realBookingId = ipnData.orderId.split('_')[0];

  // Step 2: Log raw IPN to payment_logs
  await db.query(
    `INSERT INTO payment_logs (booking_id, provider, transaction_id, amount, status, raw_response)
     VALUES ($1, 'momo', $2, $3, $4, $5)`,
    [
      realBookingId,
      String(ipnData.transId),
      ipnData.amount,
      ipnData.resultCode === 0 ? 'success' : 'failed',
      JSON.stringify(ipnData),
    ]
  );

  // Step 3: Send to SQS for worker processing
  await sendToQueue(
    {
      type: 'MOMO_IPN',
      data: ipnData,
      receivedAt: new Date().toISOString()
    },
    realBookingId,           // MessageGroupId
    String(ipnData.transId)    // MessageDeduplicationId
  );

  // Step 4: Complete booking session if payment succeeded
  if (ipnData.resultCode === 0) {
    try {
      const bookingResult = await db.query(
        'SELECT match_id, queue_token FROM bookings WHERE id = $1',
        [realBookingId]
      );
      if (bookingResult.rows.length > 0 && bookingResult.rows[0].queue_token) {
        const { match_id, queue_token } = bookingResult.rows[0];
        await queueService.completeBookingSession(match_id, queue_token);
      }
    } catch (err) {
      logger.error('Failed to complete booking session after payment', { bookingId: realBookingId, error: err.message });
    }
  }

  // Step 5: Return 200 immediately
  return { status: 'ok' };
};

/**
 * Query MoMo Transaction Status actively
 */
const queryMoMoTransaction = async (orderId) => {
  const requestId = `${orderId}_query_${Date.now()}`; // Must be unique per query
  const rawSignature = `accessKey=${process.env.MOMO_ACCESS_KEY}&orderId=${orderId}&partnerCode=${process.env.MOMO_PARTNER_CODE}&requestId=${requestId}`;
  const signature = generateMoMoSignature(rawSignature, process.env.MOMO_SECRET_KEY);

  const requestBody = {
    partnerCode: process.env.MOMO_PARTNER_CODE,
    requestId,
    orderId,
    signature,
    lang: 'vi',
  };

  try {
    const response = await axios.post(`${process.env.MOMO_ENDPOINT}/query`, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to query MoMo transaction', { error: error.message, orderId });
    return null;
  }
};

/**
 * Check payment status for a booking
 */
const checkPaymentStatus = async (bookingId, userId = null, orderId = null) => {
  let queryText = `
    SELECT b.id, b.status, b.payment_status, b.payment_method, b.transaction_id, b.total_amount
    FROM bookings b
    WHERE b.id = $1
  `;
  const params = [bookingId];

  if (userId) {
    queryText += ' AND b.user_id = $2';
    params.push(userId);
  }

  const result = await db.query(queryText, params);

  if (result.rows.length === 0) {
    throw new NotFoundError('Booking');
  }

  const booking = result.rows[0];

  // Get latest payment log
  const logResult = await db.query(
    `SELECT status, transaction_id, created_at, amount
     FROM payment_logs
     WHERE booking_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [bookingId]
  );

  // If still pending, actively query MoMo as fallback (IPN might be lost)
  if (booking.status === 'pending' && booking.payment_method === 'momo' && orderId) {
    const momoResult = await queryMoMoTransaction(orderId);

    // resultCode 0 means success
    if (momoResult && momoResult.resultCode === 0) {
      logger.info('Active query found successful MoMo payment, processing as IPN fallback', { orderId });

      // We can manually trigger the IPN handler logic here
      await handleMoMoIPN({
        partnerCode: process.env.MOMO_PARTNER_CODE,
        orderId: orderId,
        requestId: momoResult.requestId,
        amount: momoResult.amount,
        orderInfo: momoResult.orderInfo || `Đặt vé #${booking.id}`,
        orderType: 'momo_wallet',
        transId: momoResult.transId,
        resultCode: momoResult.resultCode,
        message: momoResult.message,
        payType: momoResult.payType || 'qr',
        responseTime: Date.now(),
        extraData: momoResult.extraData || '',
        signature: momoResult.signature || 'bypass' // Since we queried it directly from MoMo API, we can trust it
      }, true); // Pass a flag to bypass signature verification

      // Refresh booking state
      const updated = await db.query('SELECT status, payment_status, transaction_id FROM bookings WHERE id = $1', [bookingId]);
      if (updated.rows.length > 0 && updated.rows[0].status !== 'pending') {
        booking.status = updated.rows[0].status;
        booking.payment_status = updated.rows[0].payment_status;
        booking.transaction_id = updated.rows[0].transaction_id;
      } else {
        // If DB hasn't updated yet (async worker), optimistic return
        booking.payment_status = 'paid';
        booking.status = 'confirmed';
        booking.transaction_id = momoResult.transId;
      }
    }
  }

  return {
    bookingId: booking.id,
    bookingStatus: booking.status,
    paymentStatus: booking.payment_status,
    paymentMethod: booking.payment_method,
    transactionId: booking.transaction_id,
    totalAmount: booking.total_amount,
    lastPaymentLog: logResult.rows[0] || null,
  };
};

module.exports = {
  createMoMoPayment,
  handleMoMoIPN,
  checkPaymentStatus,
};
