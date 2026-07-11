const { sendToQueue } = require('../config/aws');
const logger = require('../utils/logger');

/**
 * Send notification via SQS to worker
 */
const enqueueNotification = async (userId, type, bookingId, channels = ['email']) => {
  if (!userId) return; // Prevent errors if userId is missing
  
  try {
    await sendToQueue(
      {
        type: 'SEND_NOTIFICATION',
        data: {
          userId,
          type,
          bookingId,
          channels,
        }
      },
      bookingId, // MessageGroupId
      `${bookingId}_${type}_${Date.now()}` // MessageDeduplicationId
    );
    logger.info('Notification queued to SQS', { userId, type, bookingId });
  } catch (error) {
    logger.error('Failed to queue notification', { error: error.message });
  }
};

/**
 * Notify about a new booking
 */
const notifyBookingCreated = async (booking) => {
  await enqueueNotification(booking.user_id, 'BOOKING_CREATED', booking.id);
};

/**
 * Notify about payment success
 */
const notifyPaymentSuccess = async (booking) => {
  await enqueueNotification(booking.user_id, 'BOOKING_CONFIRMED', booking.id);
};

/**
 * Notify about booking cancellation
 */
const notifyBookingCancelled = async (booking) => {
  await enqueueNotification(booking.user_id, 'BOOKING_CANCELLED', booking.id);
};

module.exports = {
  notifyBookingCreated,
  notifyPaymentSuccess,
  notifyBookingCancelled,
};
