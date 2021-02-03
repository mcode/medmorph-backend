const passport = require('passport');

/**
 * Helper function to obtain the token from the authorization header
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

function subscriptionAuthorization(req, res, next) {
  // TODO: implement this function to check the Subscription token matched the request
  return next();
}

module.exports = { backendAuthorization, subscriptionAuthorization };
