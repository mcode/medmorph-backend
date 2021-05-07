const crypto = require('crypto');
const { StatusCodes } = require('http-status-codes');
const passport = require('passport');
const { SUBSCRIPTIONS } = require('../storage/collections');
const db = require('../storage/DataAccess');

/**
 * Helper function to obtain the token from the authorization header
 * Note: auth header must be in form "Bearer {token}"
 *
 * @param {*} req - the express request
 * @returns the bearer token if it exists, otherwise null
 */
function getToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader) return authHeader.split(' ')[1];
  else return null;
}

/**
 * Generate a random 32 byte hex string for a token. This is only used for
 * Subscription tokens. Other access tokens are handled by the auth server.
 */
function generateToken(id) {
  const randomToken = crypto.randomBytes(32).toString('hex');
  return `${id}:${randomToken}`;
}

/**
 * Middleware for verifying the access token on a Subscription notification
 */
function subscriptionAuthorization(req, res, next) {
  if (process.env.REQUIRE_AUTH && process.env.REQUIRE_AUTH === 'false') return next();

  const token = getToken(req);
  const adminToken = process.env.ADMIN_TOKEN;
  if (adminToken && token === adminToken) return next();
  else if (token) {
    const subscriptionId = token.split(':')[0];
    if (subscriptionId) {
      const subscriptions = db.select(SUBSCRIPTIONS, s => s.id === subscriptionId);
      for (const subscription of subscriptions) {
        // Get the authorization token from the subscription
        const authorizationHeader = subscription.channel.header[0];
        const authToken = authorizationHeader.split('Authorization: Bearer ')[1];
        if (token === authToken) return next();
      }
    }
  }

  res.sendStatus(StatusCodes.UNAUTHORIZED);
}

/**
 * Check scopes before authorizing request
 */
function checkScopes(req, res, next, jwtPayload) {
  if (!jwtPayload) res.sendStatus(StatusCodes.UNAUTHORIZED);
  else {
    // Check jwtPayload for scope
    const { scope } = jwtPayload;
    const { method } = req;

    /**
     * Allow any request if scope includes "system/*.*"
     * Allow GET request if scope includes "system/*.read"
     * Allow POST, PUT, DELETE requests if scope includes "system/*.write"
     */
    if (
      scope.includes('system/*.*') ||
      (method === 'GET' && scope.includes('system/*.read')) ||
      ((method === 'POST' || method === 'PUT' || method === 'DELETE') &&
        scope.includes('system/*.write'))
    )
      return next();

    res.status(401).send('Insufficient scope');
  }
}

/**
 * Middleware for verifying either SMART Backend Authorization token or
 * the session for a user on the Admin UI. Allows protected endpoints to
 * be accessible via both authentication schemes.
 */
function userOrBackendAuthorization(req, res, next) {
  if (process.env.REQUIRE_AUTH && process.env.REQUIRE_AUTH === 'false') return next();

  const token = getToken(req);
  const adminToken = process.env.ADMIN_TOKEN;
  if (req.isAuthenticated()) return next();
  else if (adminToken && token === adminToken) return next();
  else
    return passport.authenticate('jwt', { session: false }, (_err, jwtPayload) =>
      checkScopes(req, res, next, jwtPayload)
    )(req, res, next);
}

module.exports = {
  generateToken,
  subscriptionAuthorization,
  userOrBackendAuthorization
};
