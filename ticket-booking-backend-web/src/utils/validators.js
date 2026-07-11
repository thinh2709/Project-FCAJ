const Joi = require('joi');

/**
 * Reserve tickets request body
 */
const reserveTicketsSchema = Joi.object({
  matchId: Joi.string().uuid().required(),
  tickets: Joi.array()
    .items(
      Joi.object({
        zone: Joi.string().valid('A', 'B', 'C', 'D', 'VIP').required(),
        seatNumber: Joi.string().max(20).required(),
      })
    )
    .min(1)
    .max(10)
    .required(),
  queueToken: Joi.string().hex().length(32).required(),
  sessionId: Joi.string().max(200).required(),
});

/**
 * Create match (admin)
 */
const createMatchSchema = Joi.object({
  teamA: Joi.string().max(100),
  team_a: Joi.string().max(100),
  teamB: Joi.string().max(100).allow('', null),
  team_b: Joi.string().max(100).allow('', null),
  matchDate: Joi.date().iso().greater('now'),
  match_date: Joi.date().iso().greater('now'),
  venue: Joi.string().max(255).required(),
  totalTickets: Joi.number().integer().positive(),
  total_tickets: Joi.number().integer().positive(),
  ticketPrice: Joi.number().min(10000).precision(2),
  ticket_price: Joi.number().min(10000).precision(2),
  zoneMultipliers: Joi.object().keys({
    VIP: Joi.number().min(0),
    A: Joi.number().min(0),
    B: Joi.number().min(0),
    C: Joi.number().min(0),
    D: Joi.number().min(0)
  }),
  zone_multipliers: Joi.object().keys({
    VIP: Joi.number().min(0),
    A: Joi.number().min(0),
    B: Joi.number().min(0),
    C: Joi.number().min(0),
    D: Joi.number().min(0)
  }),
  zoneCapacities: Joi.object().keys({
    VIP: Joi.number().integer().min(0),
    A: Joi.number().integer().min(0),
    B: Joi.number().integer().min(0),
    C: Joi.number().integer().min(0),
    D: Joi.number().integer().min(0)
  }),
  zone_capacities: Joi.object().keys({
    VIP: Joi.number().integer().min(0),
    A: Joi.number().integer().min(0),
    B: Joi.number().integer().min(0),
    C: Joi.number().integer().min(0),
    D: Joi.number().integer().min(0)
  }),
  imageUrl: Joi.string().max(500).allow('', null),
  image_url: Joi.string().max(500).allow('', null),
})
.xor('teamA', 'team_a')
.oxor('teamB', 'team_b')
.xor('matchDate', 'match_date')
.xor('totalTickets', 'total_tickets')
.xor('ticketPrice', 'ticket_price')
.oxor('imageUrl', 'image_url');

/**
 * Update match (admin)
 */
const updateMatchSchema = Joi.object({
  teamA: Joi.string().max(100),
  team_a: Joi.string().max(100),
  teamB: Joi.string().max(100).allow('', null),
  team_b: Joi.string().max(100).allow('', null),
  matchDate: Joi.date().iso(),
  match_date: Joi.date().iso(),
  venue: Joi.string().max(255),
  totalTickets: Joi.number().integer().positive(),
  total_tickets: Joi.number().integer().positive(),
  ticketPrice: Joi.number().min(10000).precision(2),
  ticket_price: Joi.number().min(10000).precision(2),
  zoneMultipliers: Joi.object().keys({
    VIP: Joi.number().min(0),
    A: Joi.number().min(0),
    B: Joi.number().min(0),
    C: Joi.number().min(0),
    D: Joi.number().min(0)
  }),
  zone_multipliers: Joi.object().keys({
    VIP: Joi.number().min(0),
    A: Joi.number().min(0),
    B: Joi.number().min(0),
    C: Joi.number().min(0),
    D: Joi.number().min(0)
  }),
  zoneCapacities: Joi.object().keys({
    VIP: Joi.number().integer().min(0),
    A: Joi.number().integer().min(0),
    B: Joi.number().integer().min(0),
    C: Joi.number().integer().min(0),
    D: Joi.number().integer().min(0)
  }),
  zone_capacities: Joi.object().keys({
    VIP: Joi.number().integer().min(0),
    A: Joi.number().integer().min(0),
    B: Joi.number().integer().min(0),
    C: Joi.number().integer().min(0),
    D: Joi.number().integer().min(0)
  }),
  imageUrl: Joi.string().max(500).allow('', null),
  image_url: Joi.string().max(500).allow('', null),
  status: Joi.string().valid('upcoming', 'ongoing', 'completed', 'cancelled'),
}).min(1);

/**
 * Bulk create tickets (admin)
 */
const bulkCreateTicketsSchema = Joi.object({
  tickets: Joi.array()
    .items(
      Joi.object({
        zone: Joi.string().valid('A', 'B', 'C', 'D', 'VIP').required(),
        seatNumber: Joi.string().max(20),
        seat_number: Joi.string().max(20),
        price: Joi.number().min(10000).precision(2).required(),
      })
      .xor('seatNumber', 'seat_number')
    )
    .min(1)
    .required(),
});

/**
 * Create MoMo payment
 */
const createMoMoPaymentSchema = Joi.object({
  bookingId: Joi.string().uuid().required(),
  requestType: Joi.string().valid('captureWallet', 'payWithATM', 'payWithCC').default('captureWallet'),
});

/**
 * Sync auth (Cognito user)
 */
const syncAuthSchema = Joi.object({
  email: Joi.string().email().required(),
  fullName: Joi.string().max(255),
  phone: Joi.string().max(20),
});

/**
 * Update user profile
 */
const updateProfileSchema = Joi.object({
  fullName: Joi.string().max(255),
  phone: Joi.string().max(20),
}).min(1);

/**
 * Pagination query params
 */
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

/**
 * Validate request body against a schema
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const { ValidationError } = require('./errors');
    const details = error.details.map((d) => d.message);
    return next(new ValidationError('Invalid input', { errors: details }));
  }

  req.body = value;
  next();
};

/**
 * Validate query params against a schema
 */
const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const { ValidationError } = require('./errors');
    const details = error.details.map((d) => d.message);
    return next(new ValidationError('Invalid query parameters', { errors: details }));
  }

  req.query = value;
  next();
};

module.exports = {
  reserveTicketsSchema,
  createMatchSchema,
  updateMatchSchema,
  bulkCreateTicketsSchema,
  createMoMoPaymentSchema,
  syncAuthSchema,
  updateProfileSchema,
  paginationSchema,
  validate,
  validateQuery,
};
