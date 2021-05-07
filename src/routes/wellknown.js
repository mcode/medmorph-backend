const express = require('express');
const router = express.Router();
const config = require('../storage/config');
router.get('/smart-configuration', (req, res) => {
  const smartConfiguration = {
    token_endpoint: config.getAuthTokenUrl(),
    response_types_supported: ['token'],
    scopes_supported: ['offline_access', 'system/*.*', 'system/*.read', 'system/*.write']
  };
  res.send(smartConfiguration);
});

module.exports = router;
