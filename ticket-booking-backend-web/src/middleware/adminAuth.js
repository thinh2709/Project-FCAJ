const { ForbiddenError } = require('../utils/errors');

/**
 * Admin role check middleware
 * Must be used after auth middleware
 * Checks if user belongs to 'admin' group in Cognito
 */
const adminAuth = (req, res, next) => {
  if (!req.user) {
    return next(new ForbiddenError('Authentication required'));
  }

  const groups = req.user.groups || [];
  if (!groups.includes('admin')) {
    return next(new ForbiddenError('Admin access required'));
  }

  next();
};

module.exports = adminAuth;
