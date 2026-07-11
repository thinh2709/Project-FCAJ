const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const db = require('../config/database');
const bookingService = require('../services/bookingService');
const cacheService = require('../services/cacheService');
const queueService = require('../services/queueService');
const { validate, validateQuery, createMatchSchema, updateMatchSchema, bulkCreateTicketsSchema, paginationSchema } = require('../utils/validators');
const { NotFoundError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const { redisReader } = require('../config/redis');

// All admin routes require auth + admin role
router.use(auth, adminAuth);

/**
 * POST /api/admin/matches
 * Create a new match
 */
router.post('/matches', validate(createMatchSchema), async (req, res, next) => {
  try {
    if (req.body.team_a !== undefined) req.body.teamA = req.body.team_a;
    if (req.body.team_b !== undefined) req.body.teamB = req.body.team_b;
    if (req.body.match_date !== undefined) req.body.matchDate = req.body.match_date;
    if (req.body.total_tickets !== undefined) req.body.totalTickets = req.body.total_tickets;
    if (req.body.ticket_price !== undefined) req.body.ticketPrice = req.body.ticket_price;
    if (req.body.zone_multipliers !== undefined) req.body.zoneMultipliers = req.body.zone_multipliers;
    if (req.body.zone_capacities !== undefined) req.body.zoneCapacities = req.body.zone_capacities;
    if (req.body.image_url !== undefined) req.body.imageUrl = req.body.image_url;

    const { teamA, teamB, matchDate, venue, totalTickets, ticketPrice, imageUrl } = req.body;
    const zoneMultipliers = req.body.zoneMultipliers || { VIP: 2.0, A: 1.5, B: 1.2, C: 1.0, D: 0.8 };
    const zoneCapacities = req.body.zoneCapacities || { VIP: 0, A: 0, B: 0, C: 0, D: 0 };

    const result = await db.query(
      `INSERT INTO matches (team_a, team_b, match_date, venue, total_tickets, ticket_price, zone_multipliers, zone_capacities, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [teamA, teamB || null, matchDate, venue, totalTickets, ticketPrice, JSON.stringify(zoneMultipliers), JSON.stringify(zoneCapacities), imageUrl || null]
    );

    const match = result.rows[0];
    logger.info('Match created', { matchId: match.id, teamA, teamB });

    res.status(201).json({
      success: true,
      data: match,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/matches/:id
 * Update a match
 */
router.put('/matches/:id', validate(updateMatchSchema), async (req, res, next) => {
  try {
    if (req.body.team_a !== undefined) req.body.teamA = req.body.team_a;
    if (req.body.team_b !== undefined) req.body.teamB = req.body.team_b;
    if (req.body.match_date !== undefined) req.body.matchDate = req.body.match_date;
    if (req.body.total_tickets !== undefined) req.body.totalTickets = req.body.total_tickets;
    if (req.body.ticket_price !== undefined) req.body.ticketPrice = req.body.ticket_price;
    if (req.body.zone_multipliers !== undefined) req.body.zoneMultipliers = req.body.zone_multipliers;
    if (req.body.zone_capacities !== undefined) req.body.zoneCapacities = req.body.zone_capacities;
    if (req.body.image_url !== undefined) req.body.imageUrl = req.body.image_url;

    const { id } = req.params;
    const updates = [];
    const params = [];
    let paramIndex = 1;

    const fieldMap = {
      teamA: 'team_a',
      teamB: 'team_b',
      matchDate: 'match_date',
      venue: 'venue',
      totalTickets: 'total_tickets',
      ticketPrice: 'ticket_price',
      zoneMultipliers: 'zone_multipliers',
      zoneCapacities: 'zone_capacities',
      imageUrl: 'image_url',
      status: 'status',
    };

    for (const [jsField, dbField] of Object.entries(fieldMap)) {
      if (req.body[jsField] !== undefined) {
        updates.push(`${dbField} = $${paramIndex++}`);
        const val = (jsField === 'zoneMultipliers' || jsField === 'zoneCapacities') 
          ? JSON.stringify(req.body[jsField]) 
          : (jsField === 'teamB' && !req.body[jsField] ? null : req.body[jsField]);
        params.push(val);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_UPDATES', message: 'No fields to update' } });
    }

    params.push(id);

    const result = await db.query(
      `UPDATE matches SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Match');
    }

    // Invalidate cache
    await cacheService.invalidateMatchCache(id);

    logger.info('Match updated', { matchId: id });

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/matches
 * List all events (matches) for admin
 */
router.get('/matches', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT m.*, 
              COALESCE(
                (SELECT json_object_agg(seat_zone, count)
                 FROM (
                   SELECT seat_zone, COUNT(*) as count 
                   FROM tickets 
                   WHERE match_id = m.id 
                   GROUP BY seat_zone
                 ) t),
                '{}'::json
              ) as ticket_counts
       FROM matches m
       ORDER BY match_date DESC`
    );
    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/matches/:id/tickets
 * Bulk create tickets for a match
 */
router.post('/matches/:id/tickets', validate(bulkCreateTicketsSchema), async (req, res, next) => {
  try {
    const { id: matchId } = req.params;
    const { tickets } = req.body;

    // Verify match exists and fetch capacity details
    const matchResult = await db.query(
      'SELECT id, total_tickets, zone_capacities FROM matches WHERE id = $1',
      [matchId]
    );
    if (matchResult.rows.length === 0) {
      throw new NotFoundError('Match');
    }
    const match = matchResult.rows[0];
    const totalCapacity = match.total_tickets;
    const zoneCapacities = match.zone_capacities || { VIP: 0, A: 0, B: 0, C: 0, D: 0 };

    // Fetch current ticket counts per zone in database
    const currentTicketsResult = await db.query(
      'SELECT seat_zone, COUNT(*) as count FROM tickets WHERE match_id = $1 GROUP BY seat_zone',
      [matchId]
    );
    const currentCounts = { VIP: 0, A: 0, B: 0, C: 0, D: 0 };
    let currentTotal = 0;
    for (const row of currentTicketsResult.rows) {
      currentCounts[row.seat_zone] = parseInt(row.count, 10);
      currentTotal += parseInt(row.count, 10);
    }

    // Calculate requested counts per zone
    const requestedCounts = { VIP: 0, A: 0, B: 0, C: 0, D: 0 };
    let requestedTotal = 0;
    for (const ticket of tickets) {
      requestedCounts[ticket.zone] = (requestedCounts[ticket.zone] || 0) + 1;
      requestedTotal++;
    }

    // Validate zone capacities
    for (const [zone, reqQty] of Object.entries(requestedCounts)) {
      const currentQty = currentCounts[zone] || 0;
      const maxQty = zoneCapacities[zone] || 0;
      if (currentQty + reqQty > maxQty) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CAPACITY_EXCEEDED',
            message: `Cannot generate tickets. Exceeded capacity for Zone ${zone}. Current: ${currentQty}, Requested: ${reqQty}, Max Allowed: ${maxQty}`
          }
        });
      }
    }

    // Validate total capacity
    if (currentTotal + requestedTotal > totalCapacity) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CAPACITY_EXCEEDED',
          message: `Cannot generate tickets. Exceeded total capacity for match. Current total tickets: ${currentTotal}, Requested new: ${requestedTotal}, Match Max Limit: ${totalCapacity}`
        }
      });
    }

    // Bulk insert tickets
    const values = [];
    const params = [];
    let paramIndex = 1;

    for (const ticket of tickets) {
      const seatNumber = ticket.seatNumber || ticket.seat_number;
      values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
      params.push(matchId, ticket.zone, seatNumber, ticket.price);
    }

    const result = await db.query(
      `INSERT INTO tickets (match_id, seat_zone, seat_number, price)
       VALUES ${values.join(', ')}
       ON CONFLICT (match_id, seat_zone, seat_number) DO NOTHING
       RETURNING *`,
      params
    );

    // Invalidate cache
    await cacheService.invalidateMatchCache(matchId);

    logger.info('Tickets created', { matchId, count: result.rowCount });

    res.status(201).json({
      success: true,
      data: {
        created: result.rowCount,
        tickets: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/bookings
 * List all bookings with filters
 */
router.get('/bookings', validateQuery(paginationSchema), async (req, res, next) => {
  try {
    const { page, limit, status, paymentStatus, matchId } = req.query;

    const result = await bookingService.getAllBookings(
      { status, paymentStatus, matchId },
      page,
      limit
    );

    res.status(200).json({
      success: true,
      data: result.bookings,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/stats
 * Dashboard stats
 */
router.get('/stats', async (req, res, next) => {
  try {
    // Total matches
    const matchCount = await db.query('SELECT COUNT(*) FROM matches');

    // Total bookings by status
    const bookingStats = await db.query(
      `SELECT status, payment_status, COUNT(*) as count,
              SUM(total_amount) as total_amount
       FROM bookings
       GROUP BY status, payment_status`
    );

    // Total revenue (confirmed + paid)
    const revenueResult = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total_revenue
       FROM bookings
       WHERE status = 'confirmed' AND payment_status = 'paid'`
    );

    // Daily revenue for the past 7 days (confirmed + paid)
    const dailyRevenueResult = await db.query(
      `SELECT 
         to_char(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') as date_str,
         COALESCE(SUM(total_amount), 0) as daily_revenue
       FROM bookings
       WHERE status = 'confirmed' AND payment_status = 'paid'
         AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY to_char(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')`
    );

    const dateMap = new Map();
    dailyRevenueResult.rows.forEach(row => {
      dateMap.set(row.date_str, parseFloat(row.daily_revenue));
    });

    const revenueHistory = [];
    const tz = 'Asia/Ho_Chi_Minh';
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      
      const dateStr = new Intl.DateTimeFormat('en-CA', { 
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' 
      }).format(d);
      
      const dayName = new Intl.DateTimeFormat('vi-VN', { 
        timeZone: tz, weekday: 'short' 
      }).format(d); // e.g. "Th 2", "T3"
      
      revenueHistory.push({
        name: dayName,
        date: dateStr,
        total: dateMap.get(dateStr) || 0
      });
    }

    // Upcoming matches
    const upcomingMatches = await db.query(
      `SELECT COUNT(*) FROM matches WHERE status = 'upcoming'`
    );

    // Active reservations
    const activeReservations = await db.query(
      `SELECT COUNT(*) FROM bookings WHERE status = 'pending'`
    );

    // Tickets sold today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soldToday = await db.query(
      `SELECT COUNT(*) FROM bookings
       WHERE status = 'confirmed' AND created_at >= $1`,
      [today]
    );

    // Online users from Redis sessions
    let onlineUsers = 0;
    try {
      const sessionKeys = await redisReader.keys('users:session:*');
      onlineUsers = sessionKeys.length;
    } catch (redisErr) {
      logger.error('Error reading online users from Redis', { error: redisErr.message });
    }

    res.status(200).json({
      success: true,
      data: {
        totalMatches: parseInt(matchCount.rows[0].count, 10),
        upcomingMatches: parseInt(upcomingMatches.rows[0].count, 10),
        activeReservations: parseInt(activeReservations.rows[0].count, 10),
        totalRevenue: parseFloat(revenueResult.rows[0].total_revenue),
        soldToday: parseInt(soldToday.rows[0].count, 10),
        bookingsByStatus: bookingStats.rows,
        onlineUsers,
        revenueHistory,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/queue/:eventId
 * Get queue stats for admin
 */
router.get('/queue/:eventId', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const stats = await queueService.getQueueStats(eventId);
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/queue/:eventId/allow
 * Allow top N users from the queue
 */
router.post('/queue/:eventId/allow', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { count } = req.body;
    
    if (count === undefined || count <= 0) {
      return res.status(400).json({ success: false, error: { message: 'Count must be a positive number' } });
    }

    const allowedCount = await queueService.allowUsers(eventId, parseInt(count, 10));
    res.status(200).json({
      success: true,
      data: { allowedCount },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/queue/:eventId/reset
 * Reset/Clear the virtual queue
 */
router.post('/queue/:eventId/reset', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    await queueService.resetQueue(eventId);
    res.status(200).json({
      success: true,
      message: 'Queue reset successfully',
    });
  } catch (error) {
    next(error);
  }
});

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Initialize S3 client - uses env vars if set, otherwise AWS default credential chain
const s3Config = { region: process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1' };
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}
const s3 = new S3Client(s3Config);

/**
 * POST /api/admin/upload
 * S3 Base64 Image Upload
 */
router.post('/upload', async (req, res, next) => {
  try {
    const { file, fileName, fileType } = req.body;
    
    if (!file) {
      return res.status(400).json({ success: false, error: { message: 'File is required' } });
    }

    // Decode base64
    const base64Data = file.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    const key = `matches/${Date.now()}_${fileName || 'match-image.jpg'}`;
    const bucket = process.env.S3_BUCKET_NAME || 'worldcup-demo';

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: fileType || 'image/jpeg',
      })
    );

    const imageUrl = `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    res.status(200).json({
      success: true,
      data: { imageUrl }
    });
  } catch (error) {
    logger.error('Failed to upload image to S3', { error: error.message });
    next(error);
  }
});

/**
 * DELETE /api/admin/matches/:id
 * Delete a match (and its tickets cascading) if no active bookings exist
 * Secured with SELECT FOR UPDATE to prevent race conditions during deletion.
 */
router.delete('/matches/:id', async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');
    
    // Lock the match row immediately to prevent concurrent booking insertions or status updates
    const matchLock = await client.query(
      'SELECT id, status FROM matches WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (matchLock.rows.length === 0) {
      throw new NotFoundError('Match');
    }
    
    // Check if there are active or confirmed bookings for this match
    const activeBookings = await client.query(
      "SELECT id FROM bookings WHERE match_id = $1 AND status IN ('pending', 'confirmed') LIMIT 1",
      [id]
    );
    if (activeBookings.rows.length > 0) {
      throw new AppError('MATCH_HAS_BOOKINGS', 'Không thể xóa trận đấu đang có người giữ chỗ hoặc đã bán vé thành công. Vui lòng hủy các đơn đặt vé trước.', 400);
    }
    
    // Cascading delete associated records to prevent foreign key violations in DB
    
    // 1. Delete payment logs
    await client.query(
      `DELETE FROM payment_logs WHERE booking_id IN (
        SELECT id FROM bookings WHERE match_id = $1
      )`,
      [id]
    );
    
    // 2. Delete booking items
    await client.query(
      `DELETE FROM booking_items WHERE booking_id IN (
        SELECT id FROM bookings WHERE match_id = $1
      )`,
      [id]
    );
    
    // 3. Delete bookings
    await client.query('DELETE FROM bookings WHERE match_id = $1', [id]);
    
    // 4. Delete tickets associated with the match
    await client.query('DELETE FROM tickets WHERE match_id = $1', [id]);
    
    // 5. Delete the match itself
    const result = await client.query('DELETE FROM matches WHERE id = $1 RETURNING *', [id]);
    
    // Invalidate caches
    await cacheService.invalidateMatchCache(id);
    await queueService.resetQueue(id);
    
    await client.query('COMMIT');
    
    logger.info('Match and all associated records deleted successfully', { matchId: id });
    
    res.status(200).json({
      success: true,
      message: 'Trận đấu và toàn bộ dữ liệu liên quan đã được xóa liên hoàn thành công.',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
