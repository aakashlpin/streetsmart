
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const RedisStore = require('connect-redis')(session);
const TwitterStrategy = require('passport-twitter').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const favicon = require('serve-favicon');
const compression = require('compression');
const logger = require('morgan');
const methodOverride = require('method-override');

const ddOptions = {
  response_code: true,
  tags: ['app:cheapass'],
};

const connectDatadog = require('connect-datadog')(ddOptions);

module.exports = (app, config) => {
  app.use(compression());
  app.use(express.static(`${config.root}/public`));
  app.set('port', config.port);
  app.set('views', `${config.root}/public`);
  app.engine('html', require('ejs').renderFile);
  app.set('view engine', 'html');
  app.use(favicon(`${config.root}/public/img/favicon.ico`));
  app.use(logger('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true,
  }));
  app.use(cookieParser());
  app.use(session({
    secret: 'be a fucking cheapass',
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 86400000,
    },
    store: new RedisStore(),
  }));
  app.use(methodOverride());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(connectDatadog);
};
