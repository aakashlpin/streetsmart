'use strict';

exports.index = function(req, res) {
    res.render('index');
};

exports.serverError = function(req, res) {
    res.render('500.html');
};

exports.gameOn = function(req, res) {
    res.render('emailVerified.html');
};

exports.unsubscribed = function(req, res) {
    res.render('unsubscribed.html');
};
