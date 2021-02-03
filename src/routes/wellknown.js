const express = require('express');
const router = express.Router();

router.get('/smart-configuration', (req, res) => {
  const smartConfiguration = {
    token_endpoint:
      'http://moonshot-dev.mitre.org:8090/auth/realms/backend_app/protocol/openid-connect/token',
    response_types_supported: ['token'],
    scopes_supported: ['offline_access', 'system/*.read']
  };
  res.send(smartConfiguration);
});

module.exports = router;
