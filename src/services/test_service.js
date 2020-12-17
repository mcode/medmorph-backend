module.exports = (req, res, next) => {
  res.send('Howdy from test service!')
  next();
};
