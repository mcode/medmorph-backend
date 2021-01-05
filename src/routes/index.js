const express = require('express');
const router = express.Router();

const testService = require('../services/test_service');

router.get('/', testService);

module.exports = router;
