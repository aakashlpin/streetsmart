'use strict';
var mongoose = require('mongoose');
var JobModel = mongoose.model('Job');
var _ = require('underscore');
var sellerUtils = require('../utils/seller');
var config = require('../../config/config');
var async = require('async');
var logger = require('../../logger').logger;
var urlLib = require('url');

function spliceArray (arr, batchSize) {
    var processedArr = [];
    var processedArrLength = Math.ceil( arr.length / batchSize );
    for ( var i = 0 ; i < processedArrLength ; i++ ) {
        if (i < processedArrLength - 1) {
            processedArr.push(arr.slice(i * batchSize, (i * batchSize) + batchSize));
        } else {
            processedArr.push(arr.splice(i * batchSize, arr.length));
        }
    }

    return processedArr;
}

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
                }, function(err) {
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
        var mongooseModelForFlipkart = sellerUtils.getSellerJobModelInstance('flipkart');
        mongooseModelForFlipkart.find({}).lean().exec(function(err, docs) {
            docs.forEach(function(doc) {
                var existingURL = doc.productURL;
                var newURL = existingURL.replace('www.flipkart', 'dl.flipkart');
                mongooseModelForFlipkart.update({_id: doc._id}, {productURL: newURL}, {}, function(err) {
                    if (err) {
                        console.log(err);
                    }
                });
            });
        });
        res.json({status: 'ok'});
    },
    sanitizeSnapdealUrls: function (req, res) {
        var mongooseModelForSnapdeal = sellerUtils.getSellerJobModelInstance('snapdeal');
        mongooseModelForSnapdeal.find({}).lean().exec(function(err, docs) {
            docs.forEach(function(doc) {
                var pUrl = urlLib.parse(doc.productURL, true);
                var newURL = (pUrl.protocol + '//' + pUrl.host + pUrl.pathname);
                var newAffUrl = sellerUtils.getURLWithAffiliateId(newURL);
                mongooseModelForSnapdeal.update({_id: doc._id}, {productURL: newAffUrl}, {}, function(err) {
                    if (err) {
                        console.log(err);
                    }
                });
            });
        });
        res.json({status: 'ok'});
    },
    unwindProductPriceHistory: function (req, res) {
        var sellers = _.keys(config.sellers);
        var maxBatchSize = 1000;
        async.eachSeries(sellers, function(seller, asyncCb) {
            var sellerModel = sellerUtils.getSellerJobModelInstance(seller);
            var sellerProductPriceHistoryModel = sellerUtils.getSellerProductPriceHistoryModelInstance(seller);
            sellerModel
            .find({}, {productPriceHistory: 1, email: 1, productURL: 1})
            .lean()
            .exec(function (err, docs) {
                var unwindedDocs = [];
                unwindedDocs = docs.map(function (doc) {
                    return doc.productPriceHistory.map(function (pphItem) {
                        return {
                            date: pphItem.date,
                            price: pphItem.price,
                            email: doc.email,
                            jobId: doc._id,
                            productURL: doc.productURL
                        };
                    });
                });

                unwindedDocs = _.flatten(unwindedDocs);

                if (!unwindedDocs.length) {
                    return asyncCb();
                }

                sellerProductPriceHistoryModel.collection.remove(function (err) {
                    if (err) {
                        return asyncCb('Error with removing collection' + JSON.stringify(err));
                    }

                    logger.log('info', 'seller %s - total docs - %d begin at %s', seller, unwindedDocs.length, (new Date()).toString());

                    var batchedUnwindedDocs = spliceArray(unwindedDocs, maxBatchSize);
                    logger.log('info', 'batchedUnwindedDocs length - %d', batchedUnwindedDocs.length);
                    var count = 0;
                    unwindedDocs = null;
                    async.each(batchedUnwindedDocs, function (batchedDocs, batchedDocsAsyncCb) {
                        sellerProductPriceHistoryModel.collection.insert(batchedDocs, function (err, insertedDocs) {
                            if (err) {
                                logger.log('error', err);
                                return batchedDocsAsyncCb('Error with inserting in collection' + JSON.stringify(err));
                            }
                            logger.log('info', 'seller %s - docs inserted - %d at %s count %d', seller, insertedDocs && insertedDocs.length || 0, (new Date()).toString(), ++count);
                            // insertedDocs = null;
                            batchedDocsAsyncCb();
                        });
                    }, function (err) {
                        asyncCb(err);
                        count = 0;
                    });
                });
            });
        }, function(err) {
            if (err) {
                res.json({error: err});
            } else {
                res.json({status: 'ok'});
            }
        });
    },
    assignDatesToAllExistingAlerts: function (req, res) {
      // var sellers = _.keys(config.sellers);
      // async.eachSeries(sellers, function(seller, asyncOuterCb) {
      //   var sellerModel = sellerUtils.getSellerJobModelInstance(seller);
      //   sellerModel.find({}, {_id: 1}).lean().exec(function (err, docs) {
      //     async.eachSeries(docs, function (doc, asyncInnerCb) {
      //       sellerModel.update(
      //         {_id: doc._id},
      //         {createdAt: doc._id.getTimestamp()},
      //         {},
      //         function (err, updatedDoc) {
      //           asyncInnerCb(err);
      //         }
      //       )
      //     }, function (err) {
      //       asyncOuterCb(err);
      //     })
      //   })
      // }, function (err) {
      //   if (err) {
      //     res.json({error: err})
      //   } else {
      //     res.json({sttaus: 'ok'})
      //   }
      // })
    }
};
