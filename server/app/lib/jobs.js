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
var TwitterFeed = require('./twitterFeed');
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

            TwitterFeed.postStatus(emailProduct);

            if (userDoc && userDoc.androidDeviceToken) {
              var androidNotificationMessage = emailProduct.productName + ' is now available at ₹' + emailProduct.currentPrice + '/- on ' + config.sellers[emailProduct.seller].name;
              fetch('https://fcm.googleapis.com/fcm/send', {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'Authorization': 'key=AIzaSyALFQjseu6RZJNiXCY_VuJsr-8MQTP6OKY'
                },
                body: JSON.stringify({
                  content_available: true,
                  notification: {
                    title: 'Prices have fallen!',
                    text: androidNotificationMessage
                  },
                  to: userDoc.androidDeviceToken
                })
              })
              .then(function (response) {
                return response.json();
              })
              .then(function (response) {
                logger.log('info', 'push notification response from Firebase', response);
              })
              .catch(function (e) {
                console.log('error sending push notification ', e);
              });

            }

            if (userDoc && userDoc.iOSDeviceTokens && userDoc.iOSDeviceTokens.length) {
              var iosNotificationMessage = emailProduct.productName + ' is now available at ₹' + emailProduct.currentPrice + '/- on ' + config.sellers[emailProduct.seller].name;

              var url = 'https://api.parse.com/1/push';
              fetch(url, {
                  method: 'post',
                  headers: {
                      'Accept': 'application/json',
                      'X-Parse-Application-Id': config.PARSE.APP_ID,
                      'X-Parse-REST-API-Key': config.PARSE.REST_KEY,
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    where: {
                      email: emailUser.email
                    },
                    data: _.extend({}, {
                      alert: iosNotificationMessage
                    }, emailProduct)
                  })
              })
              .then(function (response) {
                return response.json();
              })
              .then(function (response) {
                logger.log('info', 'push notification response from parse', response);
              })
              .catch(function (e) {
                console.log('error sending push notification ', e);
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
    if (job.type !== 'scraper') {
        return removeJob(job);;
    }

    var jobData = job.data,
        jobResult = job.result;

    jobData.currentPrice = parseInt(jobData.currentPrice, 10);
    jobResult.productPrice = parseInt(jobResult.productPrice, 10);

    var scrapedPrice = jobResult.productPrice;

    //modify the DB's currentPrice field
    sellerUtils
    .getSellerJobModelInstance(jobData.seller)
    .findById(jobData._id, {productPriceHistory: 0}, function(err, storedJob) {
        if (err || !storedJob) {
            logger.log('error', 'error getting seller job id #%d for seller %s when job complete', jobData._id, jobData.seller);
            removeJob(job);

        } else {
            // update params
            var updateWith = {
                currentPrice: scrapedPrice
            };

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

            sellerUtils
            .getSellerProductPriceHistoryModelInstance(jobData.seller)
            .create({
                jobId: jobData._id,
                price: scrapedPrice,
                email: storedJob.email,
                productURL: storedJob.productURL,
                date: new Date()
            }, function (err) {
                if (err) {
                    logger.log('error', 'error inserting new product price history doc in db', {error: err});
                }
            });
        }
    });
}

module.exports = {
	remove: removeJob,
	handleJobComplete: handleJobComplete,
	sendNotifications: sendNotifications
};
