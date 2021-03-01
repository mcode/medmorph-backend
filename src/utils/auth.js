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
 * Middleware for handling the default SMART Backend Authorization
 * Will first check to see if the token is "admin" and otherwise proceed
 * with keycloak verification
 */
function backendAuthorization(req, res, next) {
  // Check for admin token, otherwise proceed with keycloak authentication
  const token = getToken(req);
  if (token === 'admin') return next();
  else return passport.authenticate('keycloak', { session: false })(req, res, next);
}

/**
 * Middleware for verifying the access token on a Subscription notification
 */
function subscriptionAuthorization(req, res, next) {
  const token = getToken(req);
  if (token) {
    const subscriptionId = token.split(':')[0];
    if (subscriptionId) {
      const subscription = db.select(SUBSCRIPTIONS, s => s.id === subscriptionId);
      if (subscription.length) {
        // Get the authorization token from the subscription
        const authorizationHeader = subscription[0].channel.header[0];
        const authToken = authorizationHeader.split('Authorization: Bearer ')[1];
        if (token === authToken) return next();
      }
    }
  }

  res.send(StatusCodes.UNAUTHORIZED);
  return;
}

module.exports = { generateToken, backendAuthorization, subscriptionAuthorization };
