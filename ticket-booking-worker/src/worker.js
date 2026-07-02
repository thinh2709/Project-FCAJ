const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { handleMoMoPayment } = require('./handlers/momoPayment');
const { handleExpiredReservation } = require('./handlers/expiredReservation');
const { handleNotification } = require('./handlers/notification');
const { handleTicketGeneration } = require('./handlers/ticketGeneration');
const logger = require('./utils/logger');

const sqs = new SQSClient({ region: process.env.AWS_REGION });

let shuttingDown = false;

/**
 * Set shuttingDown flag to stop the polling loop
 */
function stopWorker() {
  shuttingDown = true;
}

/**
 * Main SQS long-polling loop
 */
async function startWorker() {
  logger.info('Worker started, polling SQS...', {
    queueUrl: process.env.SQS_BOOKING_QUEUE_URL,
  });

  while (!shuttingDown) {
    try {
      const response = await sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: process.env.SQS_BOOKING_QUEUE_URL,
          MaxNumberOfMessages: parseInt(process.env.WORKER_CONCURRENCY, 10) || 5,
          WaitTimeSeconds: parseInt(process.env.POLL_WAIT_TIME_SECONDS, 10) || 20,
          VisibilityTimeout: parseInt(process.env.VISIBILITY_TIMEOUT_SECONDS, 10) || 60,
          MessageAttributeNames: ['All'],
        })
      );

      if (response.Messages && response.Messages.length > 0) {
        logger.info(`Received ${response.Messages.length} message(s)`);
        await Promise.all(response.Messages.map((msg) => processMessage(msg)));
      }
    } catch (error) {
      if (!shuttingDown) {
        logger.error('Poll error', { error: error.message, stack: error.stack });
        await sleep(5000); // Back off on error
      }
    }
  }

  logger.info('Worker polling stopped');
}

/**
 * Process a single SQS message
 */
async function processMessage(message) {
  const startTime = Date.now();
  let messageType = 'unknown';

  try {
    const body = JSON.parse(message.Body);
    messageType = body.type;

    logger.info('Processing message', {
      messageId: message.MessageId,
      type: messageType,
    });

    switch (body.type) {
      case 'MOMO_IPN':
        await handleMoMoPayment(body.data);
        break;
      case 'RESERVATION_EXPIRED':
        await handleExpiredReservation(body.data);
        break;
      case 'SEND_NOTIFICATION':
        await handleNotification(body.data);
        break;
      case 'GENERATE_TICKET_PDF':
        await handleTicketGeneration(body.data);
        break;
      default:
        logger.warn('Unknown message type', { type: body.type });
    }

    // Delete message on success
    await sqs.send(
      new DeleteMessageCommand({
        QueueUrl: process.env.SQS_BOOKING_QUEUE_URL,
        ReceiptHandle: message.ReceiptHandle,
      })
    );

    logger.info('Message processed successfully', {
      messageId: message.MessageId,
      type: messageType,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('Message processing failed', {
      messageId: message.MessageId,
      type: messageType,
      error: error.message,
      stack: error.stack,
    });
    // Message will be retried (visibility timeout expires)
    // After 3 failures, goes to DLQ (checkout-dlq.fifo)
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { startWorker, stopWorker };
