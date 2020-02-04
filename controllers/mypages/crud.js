'use strict';

const express = require('express');
const images = require('../../lib/images');
const oauth2 = require('../../lib/oauth2');
const models = require('../../models/model-datastore');
const { validationResult } = require('express-validator');
const validation = require('../../validation');
const config = require('../../config');

const router = express.Router();

// Use the oauth middleware to automatically get the user's profile
// information and expose login/logout URLs to templates.
router.use(oauth2.template);

// Set Content-Type for all responses for these routes
router.use((req, res, next) => {
  res.set('Content-Type', 'text/html');
  next();
});


/**
 * Errors on "/mypages/*" routes.
 */
router.use((err, req, res, next) => {
  // Format error and forward to generic error handler for logging and
  // responding to the request
  err.response = err.message;
  next(err);
});

module.exports = router;
