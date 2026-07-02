const Joi = require('joi');
const logger = require('../utils/logger');

const envSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  REDIS_PRIMARY_HOST: Joi.string().required(),
  REDIS_READER_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  AWS_REGION: Joi.string().required(),
  SQS_BOOKING_QUEUE_URL: Joi.string().uri().required(),
  SNS_OPS_TOPIC_ARN: Joi.string().required(),
  SNS_USER_TOPIC_ARN: Joi.string().required(),
  COGNITO_USER_POOL_ID: Joi.string().required(),
  COGNITO_CLIENT_ID: Joi.string().required(),
  MOMO_PARTNER_CODE: Joi.string().required(),
  MOMO_ACCESS_KEY: Joi.string().required(),
  MOMO_SECRET_KEY: Joi.string().required(),
  MOMO_ENDPOINT: Joi.string().uri().required(),
  MOMO_IPN_URL: Joi.string().uri().required(),
  MOMO_REDIRECT_URL: Joi.string().uri().required(),
  PORT: Joi.number().default(8080),
  RESERVATION_TIMEOUT_MINUTES: Joi.number().default(10),
}).unknown(true);

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  logger.error(`Config validation error: ${error.message}`);
  process.exit(1);
}

module.exports = envVars;
