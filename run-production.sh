#!/usr/bin/env bash

export NODE_ENV="production"
./node_modules/.bin/gulp --env production
node server.js
