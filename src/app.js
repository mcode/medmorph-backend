require('dotenv').config();

const express = require('express');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const serversRouter = require('./routes/servers');

const app = express();

app.use(logger('dev'));
app.use(express.json());

app.use('/', indexRouter);
app.use('/servers/', serversRouter);

module.exports = app;
