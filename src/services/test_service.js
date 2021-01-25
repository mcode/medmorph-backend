const db = require('../storage/DataAccess');

module.exports = (req, res, next) => {
  const test = db.select('servers', () => true);
  console.log(test);
  const servers = db.select('servers', s => s.type === 'KA');
  console.log(servers);
  res.send('Howdy from test service!');
  next();
};
