'use strict';

// Hierarchical node.js configuration with command-line arguments, environment
// variables, and files.
const nconf = (module.exports = require('nconf'));
const path = require('path');

console.log(path.join( __dirname, 'config.json'))
nconf
  // 1. Command-line arguments
  .argv()
  // 2. Environment variables
  .env([
    'CLOUD_BUCKET',
    'NODE_ENV',
    'TWITTER_CONSUMER_KEY',
    'TWITTER_CONSUMER_SECRET',
    'TWITTER_CALLBACK',
    'PORT',
    'SECRET',
  ])
  // 3. Config file
  .file({file: path.join(__dirname, 'config.json')})
  // 4. Defaults
  .defaults({
    PORT: 8080,
    TWITTER_CALLBACK: "https://enquetia-staging.appspot.com/oauth/twitter/callback"
  });

// Check for required settings
checkConfig('CLOUD_BUCKET');
checkConfig('TWITTER_CONSUMER_KEY');
checkConfig('TWITTER_CONSUMER_SECRET');
checkConfig('TWITTER_CALLBACK');

function checkConfig(setting) {
  if (!nconf.get(setting)) {
    throw new Error(
      `You must set ${setting} as an environment variable or in config.json!`
    );
  }
}
