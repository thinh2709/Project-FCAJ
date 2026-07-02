const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

const sqs = new SQSClient({ region: process.env.AWS_REGION });

/**
 * Send a message to SQS FIFO queue
 * @param {Object} payload - Message payload with { type, data }
 * @param {string} [groupId] - Message group ID for FIFO ordering (defaults to payload.type)
 */
async function sendToSQS(payload, groupId) {
  const messageBody = JSON.stringify({
    ...payload,
    sentAt: new Date().toISOString(),
  });

  const params = {
    QueueUrl: process.env.SQS_BOOKING_QUEUE_URL,
    MessageBody: messageBody,
    MessageGroupId: groupId || payload.type,
    // Content-based deduplication is enabled on queue,
    // but we add a dedup ID for safety
    MessageDeduplicationId: uuidv4(),
  };

  try {
    const result = await sqs.send(new SendMessageCommand(params));
    logger.info('Message sent to SQS', {
      messageId: result.MessageId,
      type: payload.type,
    });
    return result;
  } catch (error) {
    logger.error('Failed to send message to SQS', {
      type: payload.type,
      error: error.message,
    });
    throw error;
  }
}

module.exports = { sendToSQS };
