const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Request logging middleware
 * Structured JSON logging compatible with CloudWatch
 */
const requestLogger = (req, res, next) => {
  // Assign unique request ID
  req.id = req.headers['x-request-id'] || uuidv4();
  res.set('X-Request-Id', req.id);

  const startTime = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user ? req.user.cognitoSub : undefined,
    };

    if (res.statusCode >= 500) {
      logger.error('Request completed with server error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
};

module.exports = requestLogger;
