'use strict';

var mongoose = require('mongoose'),
Schema = mongoose.Schema,
_ = require('underscore'),
SellerUtils = require('../utils/seller');

var JobSchema = new Schema({
    email: String,
    seller: String,
    productURL: String,
    productName: String,
    productImage: String,
    currentPrice: Number,
    isActive: Boolean
});

JobSchema.statics.activateAllJobsForEmail = function(req, callback) {
    var query    = _.pick(req.query, ['email']);
    var data     = {isActive: true};
    var options  = {multi: true};

    //pull out all jobs for this email and distribute them across collections
    this.find(query).lean().exec(function(err, pendingJobs) {
        if (err) {
            return callback(err);
        }
        _.each(pendingJobs, function(pendingJob) {
            var SellerJobModel = SellerUtils.getSellerJobModelInstance(pendingJob.seller);
            SellerJobModel.addJob(pendingJob);
        });
    });

    //also mark these jobs as activated
    this.update(query, data, options, callback);
};

JobSchema.statics.post = function(req, callback) {
    var data, Job;

    data = _.pick(req.query,
        ['email', 'currentPrice', 'productURL', 'seller', 'isEmailVerified',
        'productImage', 'productName']
    );

    var SellerJobModel = SellerUtils.getSellerJobModelInstance(data.seller);
    var findQuery = {email: data.email, productURL: data.productURL};
    SellerJobModel.getOneGeneric(findQuery, function(err, existingJob) {
        if (err) {
            return callback(err);
        }
        if (existingJob) {
            //bullshit. guy is trying to enter the same email+url combo again
            callback('This URL is already being tracked for you.');
        } else {
            //good guy. put it in jobs collection and seller's jobs collection
            this.findOne(findQuery).lean().exec(function(err, pendingJob) {
                if (err) {
                    return callback(err);
                }
                if (pendingJob) {
                    //not-so-good guy. he should have verified his email
                    callback('Tracking of this URL is pending email id verification');
                } else {
                    var jobData = {
                        email: data.email,
                        productURL: data.productURL,
                        productName: data.productName,
                        productImage: data.productImage,
                        seller: data.seller,
                        currentPrice: data.currentPrice,
                        productPriceHistory: [{
                            date: new Date(),
                            price: data.currentPrice
                        }],
                        isActive: data.isEmailVerified
                    };

                    Job = new this(jobData);
                    Job.save(callback);

                    if (data.isEmailVerified) {
                        SellerJobModel.addJob(jobData, function(){});
                    }
                }
            }.bind(this));
        }
    }.bind(this));
};

// JobSchema.statics.markJobsAsInactive = function(query, callback) {
//     var updateWith = {isActive: false};
//     var updateOptions = {multi: true};
//     this.update(query, updateWith, updateOptions, callback);
// };
//
// JobSchema.statics.updateNewPrice = function(query, updateWith, callback) {
//     var newPrice = updateWith.price;
//     this.findOne(query, function(err, doc) {
//         var updateParams = {
//             productPriceHistory: doc.productPriceHistory
//         };
//         var updateOptions = {};
//
//         if (doc) {
//             updateParams.productPriceHistory.push({
//                 date: new Date(),
//                 price: newPrice
//             });
//
//             if (doc.currentPrice !== newPrice) {
//                 updateParams.currentPrice = newPrice;
//             }
//
//             this.update(query, updateParams, updateOptions, callback);
//
//         } else {
//             callback(err, null);
//         }
//     }.bind(this));
// };
//
JobSchema.statics.get = function(req, callback) {
    //get all the jobs for an email
    var data = _.pick(req.query, ['email']);
    this.find({email: data.email}).lean().exec(callback);
};
//
// JobSchema.statics.getOneGeneric = function(query, callback) {
//     this.findOne(query).lean().exec(callback);
// };

// JobSchema.statics.getActiveJobs = function(callback) {
//     this.find({isActive: true}).lean().exec(callback);
// };
//
// JobSchema.statics.getActiveJobsForSeller = function(seller, callback) {
//     this.find({seller: seller, isActive: true}).lean().exec(callback);
// };

mongoose.model('Job', JobSchema);
