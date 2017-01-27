'use strict';
var express = require('express');
var session = require('express-session');
var passport = require('passport');
var RedisStore = require('connect-redis')(session);
var TwitterStrategy = require('passport-twitter').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var favicon = require('serve-favicon');
var compression = require('compression');
var logger = require('morgan');
var methodOverride = require('method-override');

module.exports = function(app, config) {
  app.use(compression());
  app.use(express.static(config.root + '/public'));
  app.set('port', config.port);
  app.set('views', config.root + '/public');
  app.engine('html', require('ejs').renderFile);
  app.set('view engine', 'html');
  app.use(favicon(config.root + '/public/img/favicon.ico'));
  app.use(logger('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(cookieParser());
  app.use(session({
      secret: 'be a fucking cheapass',
      resave: true,
      saveUninitialized: true,
      cookie: {
          maxAge: 86400000
      },
      store: new RedisStore()
  }));
  app.use(methodOverride());
  app.use(passport.initialize());
  app.use(passport.session());
};
