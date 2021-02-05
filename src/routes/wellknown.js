const express = require('express');
const router = express.Router();

router.get('/smart-configuration', (req, res) => {
  const smartConfiguration = {
    token_endpoint: `${process.env.AUTH}/realms/${process.env.REALM}/protocol/openid-connect/token`,
    response_types_supported: ['token'],
    scopes_supported: ['offline_access', 'system/*.read']
  };
  res.send(smartConfiguration);
});

module.exports = router;
