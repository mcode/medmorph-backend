const express = require('express');
const { StatusCodes } = require('http-status-codes');
const passport = require('passport');
const router = express.Router();

router.post('/login', passport.authenticate('local'), (req, res) => {
  console.log(req.user);
  res.send('Logged in!');
});

router.post('/logout', (req, res) => {
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
