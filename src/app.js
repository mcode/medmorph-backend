require('dotenv').config();

const express = require('express');
const logger = require('morgan');

const indexRouter = require('./routes/index');

const app = express();

app.use(logger('dev'));

app.use('/', indexRouter);

module.exports = app;
