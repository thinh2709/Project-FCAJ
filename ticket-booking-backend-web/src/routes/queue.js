const express = require('express');
const router = express.Router();
const queueService = require('../services/queueService');
const rateLimiter = require('../middleware/rateLimiter');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

/**
 * POST /api/queue/join
 * Join the virtual queue for an event
 */
router.post(
  '/join',
  rateLimiter({ maxRequests: 5, windowSeconds: 60, keyPrefix: 'ratelimit:queue_join' }),
  async (req, res, next) => {
    try {
      const { eventId, sessionId } = req.body;
      
      if (!eventId || !sessionId) {
        return res.status(400).json({ success: false, error: { message: 'eventId and sessionId are required' } });
      }

      const result = await queueService.joinQueue(eventId, sessionId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/queue/status
 * Check queue position or get allowed token
 */
router.get('/status', async (req, res, next) => {
  try {
    const { eventId, sessionId } = req.query;

    if (!eventId || !sessionId) {
      return res.status(400).json({ success: false, error: { message: 'eventId and sessionId are required' } });
    }

    const result = await queueService.getStatus(eventId, sessionId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/queue/admin/allow
 * Internal/Admin endpoint to let N users in
 * Protected: Requires admin authentication.
 */
router.post('/admin/allow', auth, adminAuth, async (req, res, next) => {
  try {
    const { eventId, count } = req.body;
    
    // NOTE: This should be protected by an admin middleware in production
    
    if (!eventId || !count) {
      return res.status(400).json({ success: false, error: { message: 'eventId and count are required' } });
    }

    const allowedCount = await queueService.allowUsers(eventId, parseInt(count, 10));

    res.status(200).json({
      success: true,
      data: {
        allowedCount
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/queue/admin/config
 * Get auto queue configuration
 */
router.get('/admin/config', auth, adminAuth, async (req, res, next) => {
  try {
    const { eventId } = req.query;
    if (!eventId) {
      return res.status(400).json({ success: false, error: { message: 'eventId is required' } });
    }
    const config = await queueService.getAutoConfig(eventId);
    res.status(200).json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/queue/admin/config
 * Update auto queue configuration
 */
router.post('/admin/config', auth, adminAuth, async (req, res, next) => {
  try {
    const { eventId, enabled, maxUsers } = req.body;
    if (!eventId || typeof enabled !== 'boolean' || !maxUsers) {
      return res.status(400).json({ success: false, error: { message: 'eventId, enabled (boolean), and maxUsers are required' } });
    }
    const config = await queueService.setAutoConfig(eventId, { enabled, maxUsers: parseInt(maxUsers, 10) });
    res.status(200).json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/queue/leave
 * Explicitly leave the queue (e.g. on unload/unmount)
 */
router.post('/leave', async (req, res, next) => {
  try {
    const { eventId, sessionId } = req.body;

    if (!eventId || !sessionId) {
      return res.status(400).json({ success: false, error: { message: 'eventId and sessionId are required' } });
    }

    await queueService.leaveQueue(eventId, sessionId);

    res.status(200).json({
      success: true,
      message: 'Left queue successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/queue/enter-booking
 * Create a Booking Session after queue grants access.
 * Validates queueToken, creates session with 10-min TTL.
 * Idempotent: returns existing session if already created (refresh/multi-tab safe).
 */
router.post('/enter-booking', async (req, res, next) => {
  try {
    const { eventId, sessionId, queueToken } = req.body;

    if (!eventId || !sessionId || !queueToken) {
      return res.status(400).json({
        success: false,
        error: { message: 'eventId, sessionId, và queueToken là bắt buộc.' }
      });
    }

    const result = await queueService.createBookingSession(eventId, sessionId, queueToken);

    // If token verification failed
    if (result.valid === false) {
      return res.status(403).json({
        success: false,
        error: { message: result.reason }
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
