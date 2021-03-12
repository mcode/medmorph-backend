const express = require('express');
const { StatusCodes } = require('http-status-codes');
const passport = require('passport');
const router = express.Router();
// const debug = require('../storage/logs').debug('medmorph-backend:auth');

router.post('/login', passport.authenticate('local'), (req, res) => {
  // debug(`${req.user.uid} logged in`);
  res.send('Logged in!');
});

router.post('/logout', (req, res) => {
  // debug(`${req.user.uid} logged out`);
  req.logOut();
  res.send('Logged out!');
});

router.get('/active', (req, res) => {
  if (req.user) {
    res.send(req.user);
  } else {
    res.status(StatusCodes.UNAUTHORIZED).send('Not logged in');
  }
});

module.exports = router;
