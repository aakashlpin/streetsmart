'use strict';

var mongoose = require('mongoose');
var UsersModel = mongoose.model('User');
var Emails = require('../controllers/emails');
var logger = require('../../logger').logger;

exports.sendMail = function(req, res) {
    UsersModel.getAll(function(err, users) {
        Emails.sendFeatureMail(users, function(err, msg) {
            if (err) {
                logger.log('error', 'error in sending freecharge email', err);
                return;
            }
            logger.log('info', msg);
        });
    });

    res.json({status: 'ok'});
};

exports.sendMailer = function(req, res) {
    UsersModel.getAll(function(err, users) {
        Emails.sendMailer(users, function(err, msg) {
            if (err) {
                logger.log('error', 'error in sending email', err);
                return;
            }
            logger.log('info', msg);
        });
    });

    res.json({status: 'ok'});
};

