require('dotenv').config();

const express = require('express');
const app = express();
const host = process.env.HOST;
const port = process.env.PORT || 3000;

const testService = require('./services/test_service');

app.use('/', testService);

app.listen(port, host, () => {
  console.log(`MedMorph Backend Service Client running at http://${host || 'localhost'}:${port}`);
});
