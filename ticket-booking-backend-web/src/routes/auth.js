const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../config/database');
const cacheService = require('../services/cacheService');
const { validate, syncAuthSchema, updateProfileSchema } = require('../utils/validators');
const { NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * POST /api/auth/sync
 * Sync Cognito user to local DB after signup
 */
router.post('/sync', auth, validate(syncAuthSchema), async (req, res, next) => {
  try {
    const { cognitoSub } = req.user;
    const { email, fullName, phone } = req.body;

    // Upsert user
    const result = await db.query(
      `INSERT INTO users (cognito_sub, email, full_name, phone)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (cognito_sub)
       DO UPDATE SET email = $2, full_name = COALESCE($3, users.full_name),
                     phone = COALESCE($4, users.phone), updated_at = NOW()
       RETURNING *`,
      [cognitoSub, email, fullName, phone]
    );

    const user = result.rows[0];

    // Cache user session
    await cacheService.cacheUserSession(cognitoSub, {
      userId: user.id,
      email: user.email,
      fullName: user.full_name || '',
    });

    logger.info('User synced', { userId: user.id, cognitoSub });

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', auth, async (req, res, next) => {
  try {
    const { cognitoSub } = req.user;

    const result = await db.query(
      'SELECT id, email, full_name, phone, created_at FROM users WHERE cognito_sub = $1',
      [cognitoSub]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User profile');
    }

    const user = result.rows[0];

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auth/me
 * Update user profile (phone, name)
 */
router.put('/me', auth, validate(updateProfileSchema), async (req, res, next) => {
  try {
    const { cognitoSub } = req.user;
    const { fullName, phone } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (fullName !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      params.push(fullName);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      params.push(phone);
    }
    updates.push('updated_at = NOW()');

    params.push(cognitoSub);

    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE cognito_sub = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User profile');
    }

    const user = result.rows[0];

    // Update cached session
    await cacheService.cacheUserSession(cognitoSub, {
      userId: user.id,
      email: user.email,
      fullName: user.full_name || '',
    });

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
