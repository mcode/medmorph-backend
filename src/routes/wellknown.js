const express = require('express');
const router = express.Router();
const configUtil = require('../storage/configUtil');
router.get('/smart-configuration', (req, res) => {
  const smartConfiguration = {
    token_endpoint: process.env.AUTH_TOKEN_URL,
    response_types_supported: ['token'],
    scopes_supported: ['offline_access', 'system/*.*', 'system/*.read', 'system/*.write']
  };
  res.send(smartConfiguration);
});

module.exports = router;
