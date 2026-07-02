/**
 * Custom error classes for standardized error handling
 */

class AppError extends Error {
  constructor(code, message, statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Missing or invalid authentication token') {
    super('UNAUTHORIZED', message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Not enough permissions') {
    super('FORBIDDEN', message, 403);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Invalid input', details = null) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

class TicketsUnavailableError extends AppError {
  constructor(unavailableSeats = []) {
    super(
      'TICKETS_UNAVAILABLE',
      'Some tickets are no longer available',
      409,
      { unavailable: unavailableSeats }
    );
  }
}

class BookingExpiredError extends AppError {
  constructor(message = 'Reservation has expired') {
    super('BOOKING_EXPIRED', message, 410);
  }
}

class PaymentError extends AppError {
  constructor(message = 'Payment processing error', details = null) {
    super('PAYMENT_FAILED', message, 502, details);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super('RATE_LIMITED', message, 429);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

module.exports = {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  TicketsUnavailableError,
  BookingExpiredError,
  PaymentError,
  RateLimitError,
  NotFoundError,
};
