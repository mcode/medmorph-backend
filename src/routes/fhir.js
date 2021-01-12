const express = require('express');
const router = express.Router();

const messagingService = require('../services/messaging');

router.post('/[$]process-message', messagingService.processMessage);

module.exports = router;
