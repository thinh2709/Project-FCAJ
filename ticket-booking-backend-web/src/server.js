require('dotenv').config();
require('./config/index'); // Validate env vars before anything else

const app = require('./app');
const logger = require('./utils/logger');
const db = require('./config/database');
const redis = require('./config/redis');
const bookingService = require('./services/bookingService');

const PORT = parseInt(process.env.PORT, 10) || 8080;

let server;

const startServer = async () => {
  try {
    // Connect to Redis
    await redis.connect();
    logger.info('Redis connections established');

    // Verify database connection
    const dbHealthy = await db.healthCheck();
    if (!dbHealthy) {
      throw new Error('Database health check failed');
    }
    logger.info('Database connection verified');

    // Run database migrations
    await db.runMigrations();

    // Start HTTP server
    server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server started on port ${PORT}`, {
        port: PORT,
        nodeEnv: process.env.NODE_ENV || 'development',
        pid: process.pid,
      });
    });

    // Start background jobs
    setInterval(() => {
      bookingService.cleanupExpiredBookings();
    }, 60000); // run every 1 minute

    // Auto-Queue Approval Job (Strict 1-In-1-Out Flow)
    const queueService = require('./services/queueService');
    setInterval(async () => {
      try {
        // 1. Get all upcoming matches
        const matches = await db.query("SELECT id FROM matches WHERE status = 'upcoming'");
        
        for (const match of matches.rows) {
          const matchId = match.id;
          
          // 2. Get current queue statistics
          const stats = await queueService.getQueueStats(matchId);
          
          // 3. Get auto config
          const autoConfig = await queueService.getAutoConfig(matchId);
          
          // 4. Check if auto queue is enabled and we need to allow more users
          if (autoConfig.enabled && stats.currentAllowedUsers < autoConfig.maxUsers && stats.waitingUsers > 0) {
            // Calculate how many we can let in
            const availableSlots = autoConfig.maxUsers - stats.currentAllowedUsers;
            const toAllow = Math.min(availableSlots, stats.waitingUsers);
            
            const allowed = await queueService.allowUsers(matchId, toAllow);
            if (allowed > 0) {
              logger.info(`[Auto-Queue] Allowed ${allowed} next user(s) from waitlist for match ${matchId} (Target: ${autoConfig.maxUsers})`);
            }
          }
        }
      } catch (err) {
        logger.error('Auto queue approval job failed', { error: err.message });
      }
    }, 5000); // Check every 5 seconds

    logger.info('Started background cleanup and auto-queue jobs');

    // Set keep-alive timeout (slightly higher than ALB idle timeout)
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

// ==================== Graceful Shutdown ====================
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Close Redis connections
        await redis.close();

        // Close database pool
        await db.close();

        logger.info('All connections closed. Exiting.');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error: error.message });
        process.exit(1);
      }
    });

    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
};

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

// Start the server
startServer();
