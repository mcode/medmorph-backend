const error = require('../storage/logs').error('medmorph-backend:test');
module.exports = (req, res, next) => {
  error('there was an error');
  res.send('Howdy from test service!');
  next();
};
