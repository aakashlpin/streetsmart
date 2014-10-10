'use strict';
var express = require('express');
var passport = require('passport');
var RedisStore = require('connect-redis')(express);
var TwitterStrategy = require('passport-twitter').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

module.exports = function(app, config) {
    app.configure(function () {
        app.use(express.compress());
        app.use(express.static(config.root + '/public'));
        app.set('port', config.port);
        app.set('views', config.root + '/public');
        app.engine('html', require('ejs').renderFile);
        app.use(express.favicon(config.root + '/public/img/favicon.ico'));
        app.use(express.logger('dev'));
        app.use(express.bodyParser());
        app.use(express.cookieParser());
        app.use(express.session({
            secret: 'be a fucking cheapass',
            cookie: {
                maxAge: 86400000
            },
            store: new RedisStore()
        }));
        app.use(express.methodOverride());
        app.use(passport.initialize());
        app.use(passport.session());
        app.use(app.router);
        app.use(function(req, res) {
            res.status(404).render('404', { title: '404' });
        });
    });
};
