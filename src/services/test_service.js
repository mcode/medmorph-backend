const error = require('../storage/logs').error('medmorph-backend:test');
module.exports = (req, res, next) => {
  error('test error', 'Test Service: Test Notification');
  res.send('Howdy from test service!');
  next();
};
