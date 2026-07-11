const { CognitoJwtVerifier } = require('aws-jwt-verify');
const { UnauthorizedError } = require('../utils/errors');
const { redisReader, redisPrimary } = require('../config/redis');
const logger = require('../utils/logger');

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: 'access',
  clientId: process.env.COGNITO_CLIENT_ID,
  region: process.env.COGNITO_REGION || 'us-east-1',
});

/**
 * JWT verification middleware
 * Extracts user info from Cognito JWT and attaches to req.user
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifier.verify(token);

    // Try to get cached user session
    const sessionKey = `users:session:${payload.sub}`;
    let cachedSession = null;
    try {
      cachedSession = await redisReader.hgetall(sessionKey);
    } catch (err) {
      logger.warn('Failed to read cached session', { error: err.message });
    }

    req.user = {
      cognitoSub: payload.sub,
      email: payload.email || (cachedSession && cachedSession.email) || null,
      groups: payload['cognito:groups'] || [],
      userId: cachedSession && cachedSession.userId ? cachedSession.userId : null,
      fullName: cachedSession && cachedSession.fullName ? cachedSession.fullName : null,
    };

    // Refresh session cache TTL
    if (cachedSession && cachedSession.userId) {
      try {
        await redisPrimary.expire(sessionKey, 3600);
      } catch (err) {
        // Non-critical, ignore
      }
    }

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return next(error);
    }
    logger.warn('JWT verification failed', { error: error.message });
    next(new UnauthorizedError());
  }
};

module.exports = auth;
