const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const logger = require('../utils/logger');

const region = process.env.AWS_REGION || 'us-east-1';

const sqsClient = new SQSClient({ region });
const snsClient = new SNSClient({ region });

/**
 * Send a message to SQS FIFO queue
 */
const sendToQueue = async (messageBody, messageGroupId, messageDeduplicationId) => {
  const params = {
    QueueUrl: process.env.SQS_BOOKING_QUEUE_URL,
    MessageBody: typeof messageBody === 'string' ? messageBody : JSON.stringify(messageBody),
    MessageGroupId: messageGroupId,
    MessageDeduplicationId: messageDeduplicationId,
  };

  try {
    const command = new SendMessageCommand(params);
    const result = await sqsClient.send(command);
    logger.info('Message sent to SQS', { messageId: result.MessageId, messageGroupId });
    return result;
  } catch (error) {
    logger.error('Failed to send message to SQS', { error: error.message, messageGroupId });
    throw error;
  }
};

/**
 * Publish a notification via SNS
 */
const publishNotification = async (topicArn, subject, message) => {
  const params = {
    TopicArn: topicArn,
    Subject: subject,
    Message: typeof message === 'string' ? message : JSON.stringify(message),
  };

  try {
    const command = new PublishCommand(params);
    const result = await snsClient.send(command);
    logger.info('Notification published to SNS', { messageId: result.MessageId, topicArn });
    return result;
  } catch (error) {
    logger.error('Failed to publish SNS notification', { error: error.message, topicArn });
    throw error;
  }
};

module.exports = {
  sqsClient,
  snsClient,
  sendToQueue,
  publishNotification,
};
