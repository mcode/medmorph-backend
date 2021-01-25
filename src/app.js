require('dotenv').config();

const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');

const fhirRouter = require('./routes/fhir');
const indexRouter = require('./routes/index');
const serversRouter = require('./routes/servers');
const subscriptionsRouter = require('./routes/subscriptions');

// const { refreshKnowledgeArtifacts } = require('./utils/fhir');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(bodyParser.json({ type: ['application/json', 'application/fhir+json'] }));

app.use('/', indexRouter);
app.use('/fhir', fhirRouter);
app.use('/servers/', serversRouter);
app.use('/notif/', subscriptionsRouter);

// refreshKnowledgeArtifacts();

module.exports = app;
