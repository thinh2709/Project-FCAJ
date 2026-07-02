require('dotenv').config();
const http = require('http');

const { validateEnv } = require('./config/index');
const { startWorker, stopWorker } = require('./worker');
const { startExpiryChecker, startInventorySync } = require('./jobs/scheduler');
const db = require('./config/database');
const redis = require('./config/redis');
const logger = require('./utils/logger');

// Validate environment variables before anything else
validateEnv();

async function main() {
  logger.info('Starting Ticketing Worker...', {
    region: process.env.AWS_REGION,
    sqsQueue: process.env.SQS_BOOKING_QUEUE_URL,
    redisHost: process.env.REDIS_HOST,
  });

  // Connect to Redis
  await redis.connect();
  logger.info('Redis connection established');

  // Verify database connection
  const dbHealthy = await db.healthCheck();
  if (!dbHealthy) {
    throw new Error('Database health check failed');
  }
  logger.info('Database connection verified');

  // Start scheduled jobs
  startExpiryChecker();
  startInventorySync();

  // Start dummy HTTP server for Elastic Beanstalk Health Checks
  const port = process.env.PORT || 8080;
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Worker is healthy\n');
  });
  
  server.listen(port, () => {
    logger.info(`Health check server listening on port ${port}`);
  });

  // Start SQS consumer (blocking loop)
  await startWorker();
}

// ==================== Graceful Shutdown ====================
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new messages
  stopWorker();

  // Force close after 30 seconds
  const timeout = setTimeout(() => {
    logger.error('Shutdown timeout, forcing exit');
    process.exit(1);
  }, 30000);

  // Give time for in-flight messages to finish
  await new Promise((resolve) => setTimeout(resolve, 5000));

  try {
    // Close Redis connection
    await redis.close();

    // Close database pool
    await db.close();

    clearTimeout(timeout);
    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

// Start the worker
main().catch((error) => {
  logger.error('Worker failed to start', { error: error.message, stack: error.stack });
  process.exit(1);
});
