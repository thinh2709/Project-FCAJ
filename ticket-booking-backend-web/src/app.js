const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

// Route imports
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const matchRoutes = require('./routes/matches');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const queueRoutes = require('./routes/queue');

const app = express();

// ==================== Security ====================
app.use(helmet());
app.use(cors({
  origin: [
    'https://d2o4wg9r0voyzj.cloudfront.net',
    'http://localhost:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ==================== Body Parsing ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ==================== Compression ====================
app.use(compression());

// ==================== Logging ====================
app.use(requestLogger);

// ==================== Global Rate Limiter ====================
app.use(rateLimiter({ maxRequests: 200, windowSeconds: 60 }));

// ==================== Trust proxy (behind ALB) ====================
app.set('trust proxy', true);

// ==================== Routes ====================
// Health checks (no auth required)
app.use('/', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/queue', queueRoutes);

// ==================== 404 Handler ====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// ==================== Error Handler ====================
app.use(errorHandler);

module.exports = app;
