const express = require('express');
const router = express.Router();
const db = require('../config/database');
const cacheService = require('../services/cacheService');
const ticketService = require('../services/ticketService');
const { validateQuery, paginationSchema } = require('../utils/validators');
const { NotFoundError } = require('../utils/errors');

/**
 * GET /api/matches
 * List all upcoming matches with pagination
 */
router.get('/', validateQuery(paginationSchema), async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const offset = (page - 1) * limit;

    // 1. Try to get from cache first
    let cachedData = await cacheService.getCachedMatchesList(page, limit);
    
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    // 2. Cache miss, fetch from DB
    const countResult = await db.query(
      "SELECT COUNT(*) FROM matches WHERE status = 'upcoming'"
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await db.query(
      `SELECT id, team_a, team_b, match_date, venue, total_tickets, ticket_price, status, image_url
       FROM matches
       WHERE status = 'upcoming'
       ORDER BY match_date ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const responseData = {
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // 3. Save to cache
    await cacheService.cacheMatchesList(page, limit, responseData);

    res.status(200).json(responseData);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/matches/:id
 * Get match details with ticket availability
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Try cache first
    let match = await cacheService.getCachedMatch(id);

    if (!match) {
      const result = await db.query(
        'SELECT * FROM matches WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Match');
      }

      match = result.rows[0];
      await cacheService.cacheMatch(id, match);
    }

    // Get ticket availability
    const availability = await ticketService.getAvailableSeats(id);

    res.status(200).json({
      success: true,
      data: {
        ...match,
        availability,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/matches/:id/seats
 * Get seat map with availability by zone
 */
router.get('/:id/seats', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify match exists
    const matchResult = await db.query('SELECT id FROM matches WHERE id = $1', [id]);
    if (matchResult.rows.length === 0) {
      throw new NotFoundError('Match');
    }

    const seatMap = await ticketService.getSeatMap(id);

    res.status(200).json({
      success: true,
      data: seatMap,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
