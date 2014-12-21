'use strict';
var  _ = require('underscore');
_.str = require('underscore.string');
var logger = require('../../logger').logger;
var config = require('../../config/config');
var Emails = require('../controllers/emails');
var gcm = require('node-gcm');
var mongoose = require('mongoose');
var UserModel = mongoose.model('User');
var sellerUtils = require('../utils/seller');
var background = require('./background');
var env = process.env.NODE_ENV || 'development';
var server = config.server[env];

function removeJob(job) {
    job.remove(function(err) {
        if (err) {
            logger.log('warn', 'failed to remove completed job', {id: job.id});
            return;
        }
        logger.log('info', config.jobRemovedLog, {id: job.id});
    });
}

function extendProductDataWithDeal (productData, callback) {
    background.getCurrentDeal(function (err, deal) {
        productData.deal = deal || {};
        callback(err, productData);
    });
}

function sendNotifications(emailUser, emailProduct) {
    UserModel.findOne({email: emailUser.email}).lean().exec(function(err, userDoc) {
        emailUser._id = userDoc._id;

        //send notification email for price change
        extendProductDataWithDeal(emailProduct, function (err, emailProduct) {
            Emails.sendNotifier(emailUser, emailProduct, function(err, message) {
                if (err) {
                    logger.log('error', 'while sending notifier email', {err: err});
                } else {
                    logger.log('info', 'successfully sent notifier email', {message: message});
                    //update the emails counter
                    sellerUtils.increaseCounter('emailsSent');
                }
            });

            if (userDoc && userDoc.deviceIds && userDoc.deviceIds.length) {
                var priceChangeMessage = 'Price of ' + emailProduct.productName + ' has ' + emailProduct.measure + ' to ' + 'Rs.' + emailProduct.currentPrice + '/-';
                var message = new gcm.Message({
                    data: {
                        'price_drop': priceChangeMessage,
                        'product_url': emailProduct.productURL
                    }
                });

                var sender = new gcm.Sender(config.googleServerAPIKey);
                var registrationIds = userDoc.deviceIds;

                /**
                 * Params: message-literal, registrationIds-array, No. of retries, callback-function
                 **/
                sender.send(message, registrationIds, 4, function (err, result) {
                    if (err) {
                        logger.log('error', 'error sending push notification', err);
                    } else {
                        logger.log('info', 'mobile notification sent', result);
                    }
                });
            }
        });
    });
}

function shouldSendAlert(data) {
    //if price is same, no alert
    if (data.storedPrice === data.scrapedPrice) {
        return false;
    }
    //if price is higher, no alert
    if (data.storedPrice < data.scrapedPrice) {
        return false;
    }
    //consider target price if it's set for this item
    if (data.targetPrice) {
        logger.log('info', 'targetPrice set');
        if (data.scrapedPrice <= data.targetPrice) {
            logger.log('info', 'targetPrice met. Sending alert');
            return true;
        }
        logger.log('info', 'not sending alert because targetPrice not met');
        return false;
    }

    //if price is lower, maybe
    var priceRange = data.storedPrice;
    var minDiff = 0;
    var isMinDiffFulfilled = false;

    if (priceRange <= 100) {
        minDiff = 10;
    } else if (priceRange > 100 && priceRange <= 500) {
        minDiff = 25;
    } else if (priceRange > 500 && priceRange <= 1000) {
        minDiff = 50;
    } else if (priceRange > 1000 && priceRange <= 2500) {
        minDiff = 75;
    } else if (priceRange > 2500 && priceRange <= 10000) {
        minDiff = 100;
    } else if (priceRange > 10000) {
        minDiff = 250;
    }

    isMinDiffFulfilled = (data.storedPrice - data.scrapedPrice >= minDiff);

    if (!isMinDiffFulfilled) {
        logger.log('info', 'not sending alert because min diff not met', {diff: data.storedPrice - data.scrapedPrice, minDiff: minDiff});
        return false;
    }

    //wow. you really want the alert. Ok. Last check!

    //if the alert about to be sent is same as the last one, no alert
    if (data.alertToPrice === data.scrapedPrice) {
        logger.log('info', 'not sending alert because duplicate as last one');
        return false;
    }

    //ok. you win. now buy, please?
    return true;
}

function sendAlert (jobData, jobResult) {
    var shouldSendAlertPayload = {
        storedPrice     : jobData.currentPrice,
        scrapedPrice    : jobResult.productPrice,
        alertToPrice    : jobData.alertToPrice,
        alertFromPrice  : jobData.alertFromPrice,
        targetPrice     : jobData.targetPrice
    };

    if (shouldSendAlert(shouldSendAlertPayload)) {
        var emailProduct = _.extend({}, jobData, {
            storedPrice : shouldSendAlertPayload.storedPrice,
            currentPrice: shouldSendAlertPayload.scrapedPrice,
            measure     : shouldSendAlertPayload.storedPrice > shouldSendAlertPayload.scrapedPrice ? 'dropped': 'increased',
            trackURL    : (server + '/track/' + jobData.seller + '/' + jobData._id)
        });

        sendNotifications({email: jobData.email}, emailProduct);

        return true;
    }

    return false;
}

function handleJobComplete (job) {
    var jobData = job.data,
        jobResult = job.result;

    jobData.currentPrice = parseInt(jobData.currentPrice, 10);
    jobResult.productPrice = parseInt(jobResult.productPrice, 10);

    var scrapedPrice = jobResult.productPrice;

    //modify the DB's currentPrice field and productPriceHistory array
    sellerUtils
    .getSellerJobModelInstance(jobData.seller)
    .findById(jobData._id, function(err, storedJob) {
        if (err || !storedJob || (storedJob && !storedJob.productPriceHistory)) {
            logger.log('error', 'error getting seller job id #%d for seller %s when job complete', jobData._id, jobData.seller);
            removeJob(job);

        } else {
            // update params
            var updateWith = {};

            storedJob.productPriceHistory.push({
                date: new Date(),
                price: scrapedPrice
            });

            _.extend(updateWith, {
                currentPrice: scrapedPrice,
                productPriceHistory: storedJob.productPriceHistory
            });

            if (sendAlert(jobData, jobResult)) {
                //if going to send an aler, update relevant params
                _.extend(updateWith, {
                    alertToPrice: scrapedPrice,
                    alertFromPrice: storedJob.currentPrice
                });
            }

            sellerUtils
            .getSellerJobModelInstance(jobData.seller)
            .update({_id: jobData._id}, updateWith, {}, function(err) {
                if (err) {
                    logger.log('error', 'error updating price in db', {error: err});
                }
                removeJob(job);
            });
        }
    });
}

module.exports = {
	remove: removeJob,
	handleJobComplete: handleJobComplete,
	sendNotifications: sendNotifications
};