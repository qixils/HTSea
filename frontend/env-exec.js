#!/usr/bin/env node

const {spawn} = require('child_process');
const path = require('path');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');

// Read in .env from the parent directory.
const envFile = path.resolve(__dirname, '..', '.env');
const env = dotenv.config({path: envFile});
dotenvExpand.expand(env);

spawn(process.argv[2], process.argv.slice(3), {
  stdio: 'inherit'
});
