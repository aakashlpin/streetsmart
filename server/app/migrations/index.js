'use strict';
var mongoose = require('mongoose');
var JobModel = mongoose.model('Job');
var _ = require('underscore');
var sellerUtils = require('../utils/seller');
var config = require('../../config/config');
var async = require('async');

module.exports = {
    shardJobs: function(req, res) {
        JobModel.find({isActive: true}).lean().exec(function(err, jobs) {
            _.each(jobs, function(job) {
                delete job._id;
                delete job.isActive;

                job.seller = job.seller.toLowerCase();
                var seller = job.seller;

                var mongooseModelForSeller = sellerUtils.getSellerJobModelInstance(seller);

                delete job.seller;

                mongooseModelForSeller.addJob(job);
            });
        });

        res.json({status: 'ok'});
    },
    markAllJobsAsActive: function(req, res) {
        var sellers = _.keys(config.sellers);
        async.each(sellers, function(seller, asyncCb) {
            var sellerModel = sellerUtils.getSellerJobModelInstance(seller);
            sellerModel.markActive(function(err, done) {
                console.log(done);
                asyncCb(err);
            });
        }, function(err) {
            if (err) {
                res.json({error: err});
            } else {
                res.json({status: 'ok'});
            }
        });
    },
    normalizeFlipkartURLs: function(req, res) {
        var seller = 'flipkart';
        var mongooseModelForFlipkart = sellerUtils.getSellerJobModelInstance('flipkart');
        mongooseModelForFlipkart.normalizeURL(function(err){
            if (err) {
                console.log(err);
            }
        });
        res.json({status: 'ok'});
    },
    initializeCounters: function(req, res) {
        async.parallel([
            function(callback) {
                var mongooseUsersModel = mongoose.model('User');
                mongooseUsersModel.find().lean().exec(function(err, users) {
                    callback(null, users.length);
                });
            },
            function(callback) {
                var mongooseJobsModel = mongoose.model('Job');
                mongooseJobsModel.find().lean().exec(function(err, jobs) {
                    callback(null, jobs.length);
                });
            }],
            function(err, results) {
                var mongooseCounterModel = mongoose.model('Counter');
                mongooseCounterModel.initialize({
                    totalUsers: results[0],
                    itemsTracked: results[1],
                    emailsSent: 9524   //from Postmark since 2nd July 2014
                }, function(err, doc) {
                    if (err) {
                        console.log('error in initializing counters');
                    } else {
                        console.log('counters initialized');
                    }
                });
                res.json({status: 'ok'});
            }
        );
    },
    removeAllInActiveJobs: function(req, res) {
        var sellers = _.keys(config.sellers);
        async.each(sellers, function(seller, asyncCb) {
            var sellerModel = sellerUtils.getSellerJobModelInstance(seller);
            sellerModel.find({isActive: false}).remove(function(err, done) {
                console.log(done);
                asyncCb(err);
            });
        }, function(err) {
            if (err) {
                res.json({error: err});
            } else {
                res.json({status: 'ok'});
            }
        });
    },
    smartFlipkartURLs: function(req, res) {
        var seller = 'flipkart';
        var mongooseModelForFlipkart = sellerUtils.getSellerJobModelInstance('flipkart');
        mongooseModelForFlipkart.find({}).lean().exec(function(err, docs) {
            docs.forEach(function(doc) {
                var existingURL = doc.productURL;
                var newURL = existingURL.replace('flipkart.com/dl/dl/', 'flipkart.com/dl/');
                mongooseModelForFlipkart.update({_id: doc._id}, {productURL: newURL}, {}, function(err, updatedDoc) {
                    if (err) {
                        console.log(err);
                    }
                });
            });
        })
        res.json({status: 'ok'});
    }
};
