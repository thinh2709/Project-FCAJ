const express = require('express');
const router = express.Router();
const db = require('../config/database');
const redis = require('../config/redis');

/**
 * GET /
 * Root route for default AWS Elastic Beanstalk Health Check
 */
router.get('/', (req, res) => {
  res.status(200).send('OK - Ticket Booking Backend is healthy!');
});

/**
 * GET /health
 * Health check for ALB
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /ready
 * Readiness check (DB + Redis connected)
 */
router.get('/ready', async (req, res) => {
  const checks = {};

  // Check Database
  checks.database = await db.healthCheck();

  // Check Redis
  checks.redis = await redis.healthCheck();

  const allHealthy = checks.database && checks.redis;

  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    status: allHealthy ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
