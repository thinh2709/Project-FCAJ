const logger = require('../utils/logger');

const requiredVars = [
  'DATABASE_URL',
  'REDIS_HOST',
  'AWS_REGION',
  'SQS_BOOKING_QUEUE_URL',
  'S3_BUCKET_NAME',
];

function validateEnv() {
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  logger.info('Environment variables validated successfully');
}

module.exports = { validateEnv };
