'use strict';
var mongoose = require('mongoose');
var JobModel = mongoose.model('Job');
var _ = require('underscore');
var sellerUtils = require('../utils/seller');

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
    }
};
