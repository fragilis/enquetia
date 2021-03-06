// Copyright 2017, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

// [START debug]
// Activate Google Cloud Trace and Debug when in production
if (process.env.NODE_ENV === 'production') {
  require('@google-cloud/trace-agent').start();
  require('@google-cloud/debug-agent').start();
}
// [END debug]

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const express = require('express');
const flash = require('express-flash');
const oauth = require('./lib/oauth')
const session = require('express-session');
//const passport = require('passport')
//  , TwitterStrategy = require('passport-twitter').Strategy;
const passport = oauth.passport;
const path = require('path');
const schedule = require('node-schedule');

const {Datastore} = require('@google-cloud/datastore');
const DatastoreStore = require('@google-cloud/connect-datastore')(session);

const config = require('./config');
const cron = require('./cron');
const logging = require('./lib/logging');

const app = express();

app.disable('etag');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('trust proxy', true);

// Add the request logger before anything else so that it can
// accurately log requests.
// [START requests]
app.use(logging.requestLogger);
// [END requests]

// Configure the session and session storage.
const sessionConfig = {
  resave: false,
  saveUninitialized: false,
  secret: config.get('SECRET'),
  signed: true,
  store: new DatastoreStore({
    dataset: new Datastore(),
    kind: 'express-sessions',
  }),
};

const j = schedule.scheduleJob('00 */1 * * *', function() {
  cron.refreshVotes();
});

app.use(session(sessionConfig));
app.use(express.static('public'));

// flash
app.use(flash());

// OAuth
app.use(passport.initialize());
app.use(passport.session());
app.use(oauth.router);
app.use(oauth.template);

// parse application/x-www-form-urlencoded 
app.use(bodyParser.urlencoded({
  extended: true,
  type: 'application/x-www-form-urlencoded'
}));

// parse application/json 
app.use(bodyParser.json({ type: 'application/*+json' }));
app.use(cookieParser(config.get('SECRET')));

app.use('/api', require('./controllers/enquetes/api'));
app.use('/mypage', require('./controllers/mypages/crud'));
app.use('/', require('./controllers/enquetes/crud'));

// Add the error logger after all middleware and routes so that
// it can log errors from the whole application. Any custom error
// handlers should go after this.
// [START errors]
app.use(logging.errorLogger);

// Basic 404 handler
app.use((req, res) => {
  //res.status(404).send('Not Found');
  res.status(404).render('404.pug');
});

// Basic error handler
app.use((err, req, res, next) => {
  /* jshint unused:false */
  // If our routes specified a specific response, then send that. Otherwise,
  // send a generic message so as not to leak anything.
  //res.status(500).send(err.response || 'Something broke!');
  res.status(500).render('500.pug');
});
// [END errors]

if (module === require.main) {
  // Start the server
  const server = app.listen(config.get('PORT'), () => {
    const port = server.address().port;
    console.log(`App listening on port ${port}`);
  });
}

module.exports = app;
