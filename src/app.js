require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const KeycloakBearerStrategy = require('passport-keycloak-bearer');
const LocalStrategy = require('passport-local').Strategy;

const authRouter = require('./routes/auth');
const fhirRouter = require('./routes/fhir');
const indexRouter = require('./routes/index');
const publicRouter = require('./routes/public');
const wellKnownRouter = require('./routes/wellknown');
const subscriptionsRouter = require('./routes/subscriptions');
const { storeRequest } = require('./storage/logs');

const {
  backendAuthorization,
  subscriptionAuthorization,
  userAuthorization
} = require('./utils/auth');
const { refreshAllKnowledgeArtifacts, subscribeToKnowledgeArtifacts } = require('./utils/fhir');
const { runWhenDBReady } = require('./storage/postinit');
const { genericController } = require('./handlers/crudHandler');
const collections = require('./storage/collections');

const app = express();
app.use(
  session({
    secret: crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false
  })
);
app.use('/public', express.static(__dirname + '/../public'));
app.use(logger('dev'));
app.use(express.json());
app.use(bodyParser.json({ type: ['application/json', 'application/fhir+json'] }));
app.use(function(req, res, next) {
  storeRequest(req);
  next();
});

app.use(passport.initialize());
app.use(passport.session());

// Setup passport to use keycloak
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

// Set up passport to use local config
passport.use(new LocalStrategy({ usernameField: 'email' }, localConfig));
passport.serializeUser((user, done) => {
  done(null, user.uid);
});
passport.deserializeUser((uid, done) => {
  // In the future, we might store user info (name, roles, etc) via the passport.authenticate
  // cb. If we did that, this is where we would reconstitute the user.
  done(null, { uid });
});
async function localConfig(email, password, done) {
  // TODO: MEDMORPH-67 will update this
  if (email === 'admin' && password === 'password') return done(null, { uid: 'admin' });
  else return done(null, false, { message: 'Invalid login' });
}

// Open Routes
app.use('/.well-known', wellKnownRouter);
app.use('/public', publicRouter);
app.use('/auth', authRouter);

// Routes for collections
Object.values(collections).forEach(collectionName => {
  app.use(`/collection/${collectionName}`, userAuthorization, genericController(collectionName));
});

// frontend
app.get('/', (req, res) => res.sendFile('index.html', { root: __dirname + '/../public' }));

// Protected Routes
app.use('/index', backendAuthorization, indexRouter);
app.use('/fhir', backendAuthorization, fhirRouter);
app.use('/notif', subscriptionAuthorization, subscriptionsRouter);

runWhenDBReady(refreshAllKnowledgeArtifacts);
runWhenDBReady(subscribeToKnowledgeArtifacts);

module.exports = app;
