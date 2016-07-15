'use strict';
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var busboy = require('connect-busboy');
var fileUpload = require('express-fileupload');

module.exports = function(app) {

  // Important to have this before any session middleware
  // because what is a session without a cookie?
  // No session at all.
  app.use(cookieParser());

  // Parse our POST and PUT bodies.
  app.use(fileUpload());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

};