'use strict';
// var jobs = require('./jobs');
var Emails = require('./emails');
var _ = require('underscore');
_.str = require('underscore.string');
var mongoose = require('mongoose');
var User = mongoose.model('User');
var Job = mongoose.model('Job');
var config = require('../../config/config');
var logger = require('../../logger').logger;
var sellerUtils = require('../utils/seller');
var async = require('async');

module.exports = {
    getTracks: function(req, res) {
        var userEmail = decodeURIComponent(req.params.userEmail);
        var sellers = _.keys(config.sellers);
        var responseData = [];
        async.each(sellers, function(seller, asyncCb) {
            var SellerJobModel = sellerUtils.getSellerJobModelInstance(seller);
            var responseObject = {
                seller: seller,
                tracks: []
            };
            SellerJobModel.find({email: userEmail}, {productPriceHistory: 0}).lean().exec(function(err, items) {
                if (err) {
                    asyncCb(err);
                } else {
                    responseObject.tracks = items;
                    responseData.push(responseObject);
                    asyncCb();
                }
            });
        }, function(err) {
            if (err) {
                res.json({err: err});
                return;
            }
            res.json(responseData);
        });
    },
    sendDashboardLink: function(req, res) {
        var rawEmail = req.query.email;
        if (!rawEmail || typeof rawEmail === 'undefined') {
            res.json({error: 'Please provide an email id'});
            return;
        }

        var email = decodeURIComponent(req.query.email);
        User.get({query: {email: email}}, function(err, user) {
            if (err) {
                res.json({error: err});
                return;
            }
            Emails.sendWelcome(user, function(err, done) {
                if (err) {
                    logger.log('error', 'error in sending dashboard link email', err);
                    res.json({error: err});
                } else if (done) {
                    res.json({status: 'ok'});
                }
            });
        });
    },
    getUsers: function(req, res) {
        Job.find().lean().exec(function(err, jobs) {
            if (err) {
                res.json({error: err});
                return;
            }
            //find all unique email ids
            var uniqueEmails = [];
            _.each(jobs, function(job) {
                if (!_.find(uniqueEmails, function(emailObj){ return emailObj.email === job.email; })) {
                    uniqueEmails.push({
                        email: job.email,
                        isActive: job.isActive
                    });
                }
            });
            res.json(uniqueEmails);
        });
    },
    setPreferences: function(req, res) {
        var email = req.params.userEmail,
        dropOnlyAlerts = req.query.dropOnlyAlerts;

        User.update({email: email}, {dropOnlyAlerts: dropOnlyAlerts}, {}, function(err, updatedDoc) {
            if (err) {
                res.json({error: err});
            } else {
                res.json({status: 'ok'});
            }
        });
    }
};
