const express = require('express');
const router = express.Router();

const publicKey = require('../keys/publicKey.json');

router.get('/jwks', (req, res) => {
  res.send(publicKey);
});

module.exports = router;
