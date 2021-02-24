require('dotenv').config();

const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const passport = require('passport');
const KeycloakBearerStrategy = require('passport-keycloak-bearer');

const fhirRouter = require('./routes/fhir');
const indexRouter = require('./routes/index');
const publicRouter = require('./routes/public');
const serversRouter = require('./routes/servers');
const wellKnownRouter = require('./routes/wellknown');
const subscriptionsRouter = require('./routes/subscriptions');

const { backendAuthorization, subscriptionAuthorization } = require('./utils/auth');
const { refreshKnowledgeArtifacts } = require('./utils/fhir');

const app = express();
app.use('/public', express.static(__dirname + '/../public'));
app.use(logger('dev'));
app.use(express.json());
app.use(bodyParser.json({ type: ['application/json', 'application/fhir+json'] }));
app.use(passport.initialize());

passport.use(
  new KeycloakBearerStrategy(
    {
      realm: process.env.REALM,
      url: process.env.AUTH
    },
    (jwtPayload, done) => {
      return done(null, jwtPayload);
    }
  )
);

// Open Routes
app.use('/.well-known', wellKnownRouter);
app.use('/public', publicRouter);
// frontend
app.get('/', (req, res) => res.sendFile('index.html', { root: __dirname + '/../public' }));

// Protected Routes
app.use('/index', backendAuthorization, indexRouter);
app.use('/fhir', backendAuthorization, fhirRouter);
app.use('/servers', backendAuthorization, serversRouter);
app.use('/notif', subscriptionAuthorization, subscriptionsRouter);

setTimeout(() => refreshKnowledgeArtifacts(), 1000);

module.exports = app;
