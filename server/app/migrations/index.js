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
    }
};
