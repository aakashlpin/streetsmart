'use strict';
var kue = require('kue');
var request = require('request');
var parser  = require('cheerio');
var  _ = require('underscore');
_.str = require('underscore.string');
var config = require('../../config/config');
var CronJob = require('cron').CronJob;
var mongoose = require('mongoose');
var Emails = require('./emails');
var logger = require('../../logger').logger;
var sellerUtils = require('../utils/seller');
var async = require('async');
var gcm = require('node-gcm');
var UserModel = mongoose.model('User');
// var fs = require('fs');

var jobsQ = kue.createQueue(),
Jobs = mongoose.model('Job');

kue.app.listen(config.kuePort);

function newJob (jobData) {
    //title is a field necessary for the kue lib
    jobData.title = 'Processing ' + jobData.productName;
    delete jobData.productPriceHistory;

    var job = jobsQ.create('scraper', jobData);
    job.save();
}

function removeJob(job) {
    job.remove(function(err) {
        if (err) {
            logger.log('warn', 'failed to remove completed job #%d', job.id);
            return;
        }
        logger.log('info', 'removed completed job #%d', job.id);
    });
}

function shouldSendNotification(itemDetails) {
    if (itemDetails.measure === 'increased') {
        return false;
    }

    var priceRange = itemDetails.oldPrice;
    var minDiff = 0;

    if (priceRange <= 100) {
        minDiff = 10;
    } else if (priceRange > 100 && priceRange <= 500) {
        minDiff = 25;
    } else if (priceRange > 500 && priceRange <= 1000) {
        minDiff = 50;
    } else if (priceRange > 1000 && priceRange <= 2500) {
        minDiff = 75;
    } else if (priceRange > 2500) {
        minDiff = 100;
    }

    return (itemDetails.oldPrice - itemDetails.currentPrice >= minDiff);
}

function sendNotifications(emailUser, emailProduct) {
    UserModel.findOne({email: emailUser.email}).lean().exec(function(err, userDoc) {
        // var sendOutNotification = true;
        emailUser._id = userDoc._id;
        //if we are about to send a price increase alert
        // if (!_.isUndefined(userDoc.dropOnlyAlerts)) {
        //     if (emailProduct.measure === 'increased' && userDoc.dropOnlyAlerts) {
        //         sendOutNotification = false;
        //     }
        // }

        if (!shouldSendNotification(emailProduct)) {
            delete userDoc._id;
            logger.log('info', 'price change alert not going out for ', userDoc);
            return;
        }

        //send notification email for price change
        Emails.sendNotifier(emailUser, emailProduct, function(err, message) {
            if (err) {
                logger.log('error', 'while sending notifier email', {err: err});
            } else {
                logger.log('info', 'successfully sent notifier email', {message: message});
                //update the emails counter
                sellerUtils.increaseCounter('emailsSent');
            }
        });

        if (userDoc && userDoc.device_ids && userDoc.device_ids.length) {
            var priceChangeMessage = 'Price of ' + emailProduct.productName + ' has ' + emailProduct.measure + ' to ' + 'Rs.' + emailProduct.currentPrice + '/-';
            var message = new gcm.Message({
                data: {
                    price_drop: priceChangeMessage,
                    product_url: emailProduct.productURL
                }
            });

            var sender = new gcm.Sender(config.googleServerAPIKey);
            var registrationIds = userDoc.device_ids;

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
}

jobsQ.on('job complete', function(id) {
    kue.Job.get(id, function(err, job) {
        if (err) {
            return;
        }

        var jobData = job.data;
        var jobResult = job.result;

        var jobQuery = {email: jobData.email, productURL: jobData.productURL};

        var previousPrice = parseInt(jobData.currentPrice, 10);
        var newPrice = parseInt(jobResult.productPrice, 10);

        if (_.isNaN(newPrice)) {
            logger.log('warning', 'price parseInt resulted as NaN. original data attached', {price: jobResult.productPrice});
            return removeJob(job);
        }

        if (previousPrice !== newPrice) {
            var emailUser = {email: jobData.email};
            var seller = sellerUtils.getSellerFromURL(jobData.productURL);
            var emailProduct = _.extend(jobData, {
                currentPrice: newPrice,
                oldPrice: previousPrice,
                seller: _.str.capitalize(seller),
                measure: previousPrice > newPrice ? 'dropped': 'increased',
                trackURL: config.server + '/track/' + seller + '/' + jobData._id
            });

            sendNotifications(emailUser, emailProduct);
        }

        //modify the DB's currentPrice field and productPriceHistory array
        Jobs.updateNewPrice(jobQuery, {price: newPrice}, function(err, updatedJob) {
            if (err) {
                logger.log('error', 'job completed db update fails', {err: err});
            }
            if (updatedJob) {
                logger.log('info', 'job completed db update succeeds', updatedJob);
            }

            removeJob(job);
        });
    });
});

function processURL(url, callback) {
    logger.log('info', 'scrape url', {url: url});

    var seller = sellerUtils.getSellerFromURL(url);

    if (!config.sellers[seller]) {
        callback('seller not supported');
        return;
    }

    if (config.sellers[seller].hasDeepLinking) {
        url = sellerUtils.getDeepLinkURL(seller, url);
    }

    var requestOptions = {
        url: url
    };

    if (config.sellers[seller].hasProductAPI) {
        require('../sellersAPI/' + seller)(url, callback);
        return;
    }

    if (config.sellers[seller].requiresUserAgent) {
        requestOptions.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36'
        };
    }

    request(requestOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var $ = parser.load(body);

            if (!callback) {
                logger.log('error', 'scraping without a callback');
            }

            var scrapedData = require('../sellers/' + seller)($);
            if (callback) {
                if (scrapedData.price && (parseInt(scrapedData.price) >= 0)) {
                    callback(null, {
                        productPrice: scrapedData.price,
                        productTitle: scrapedData.name,
                        productImage: scrapedData.image
                    });
                } else {
                    // fs.writeFileSync('dom.txt', body);
                    logger.log('error', 'page scraping failed', {requestOptions: requestOptions, scrapedData: scrapedData});
                    callback('Could not determine price information from page');
                }
            }

        } else {
            if (response && response.statusCode) {
                logger.log('error', 'request module', {error: error, responseCode: response.statusCode, requestOptions: requestOptions});

            } else {
                logger.log('error', 'request module', {error: error, body: body, requestOptions: requestOptions});
            }

            if (callback) {
                callback('error in scraping');
            }
        }
    });
}

function init() {
    if (!config.isCronActive) {
        logger.log('info', '=========== Cron Jobs are disabled =============');
        return;
    }

    //since each seller has different cron pattern
    //fetch each seller's cron pattern and create different cron jobs
    var env = process.env.NODE_ENV || 'development';
    var sellers = config.sellers;

    function cronWorker(seller, SellerJobModel) {
        SellerJobModel.get(function(err, activeJobs) {
            if (err) {
                logger.log('error', 'unable to get active jobs from db', {err: err});
                return;
            }

            logger.log('info', 'active jobs for seller', {
                seller: seller,
                activeJobs: activeJobs.length
            });

            activeJobs.forEach(function(activeJob) {
                newJob(activeJob);
            });
        });
    }

    function createWorkerForSeller (seller, asyncEachCallback) {
        var sellerData = sellers[seller];
        var SellerJobModel = sellerUtils.getSellerJobModelInstance(seller);
        new CronJob({
            cronTime: sellerData.cronPattern[env],
            onTick: function() {
                cronWorker(seller, SellerJobModel);
            },
            start: true,
            timeZone: 'Asia/Kolkata'
        });
        asyncEachCallback();
    }

    //foreach seller, create a cron job
    async.each(_.keys(sellers), createWorkerForSeller);

    //put scraping inside init
    jobsQ.process('scraper', function (job, done) {
        processURL(job.data.productURL, done);
    });
}

exports.init = init;
exports.processURL = processURL;
exports.sendNotifications = sendNotifications;
