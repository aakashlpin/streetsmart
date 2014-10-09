'use strict';
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
var moment = require('moment');
var queue = require('../lib/queue.js');
var jobUtils = require('../lib/jobs.js');
var latestJobProcessedAt;

function sendNotifications(emailUser, emailProduct) {
    UserModel.findOne({email: emailUser.email}).lean().exec(function(err, userDoc) {
        emailUser._id = userDoc._id;

        //human readable seller name
        emailProduct.seller = config.sellers[emailProduct.seller].name;

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
        return false;
    }

    //wow. you really want the alert. Ok. Last check!

    //if the alert about to be sent is same as the last one, no alert
    if (data.alertToPrice === data.scrapedPrice) {
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
        alertFromPrice  : jobData.alertFromPrice
    };

    if (shouldSendAlert(shouldSendAlertPayload)) {
        var emailProduct = _.extend({}, jobData, {
            storedPrice : shouldSendAlertPayload.storedPrice,
            currentPrice: shouldSendAlertPayload.scrapedPrice,
            measure     : shouldSendAlertPayload.storedPrice > shouldSendAlertPayload.scrapedPrice ? 'dropped': 'increased',
            trackURL    : (config.server + '/track/' + jobData.seller + '/' + jobData._id)
        });

        sendNotifications({email: jobData.email}, emailProduct);

        return true;
    }

    return false;
}

function handleJobComplete (id) {
    queue.getJobById(id, function(err, job) {
        if (err) {
            logger.log('error', 'error getting job id from kue when job completed #%d', id);
            return;
        }

        var jobData = job.data,
            jobResult = job.result;

        jobData.currentPrice = parseInt(jobData.currentPrice, 10);
        jobResult.productPrice = parseInt(jobResult.productPrice, 10);

        var scrapedPrice = jobResult.productPrice;

        //modify the DB's currentPrice field and productPriceHistory array
        sellerUtils
        .getSellerJobModelInstance(jobData.seller)
        .findById(jobData._id, function(err, storedJob) {
            if (err) {
                logger.log('error', 'error getting seller job id #%d for seller %s when job complete', jobData._id, jobData.seller);
                jobUtils.remove(job);

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
                    jobUtils.remove(job);
                });
            }
        });
    });
}

function handleURL404 (url, seller, callback) {
    logger.log('info', 'removing url due to 404', {url: url});
    if (!callback) {
        callback = function() {};
    }

    sellerUtils
    .getSellerJobModelInstance(seller)
    .find({productURL: url})
    .remove(callback);
}

function handleURLSuccess (requestOptions, isBackgroundTask, seller, response, body, callback) {
    var $ = parser.load(body);

    if (!callback) {
        logger.log('error', 'scraping without a callback');
        return;
    }

    //TODO support isBackgroundTask
    var scrapedData = require('../sellers/' + seller)($, isBackgroundTask);
    if (scrapedData.price && (parseInt(scrapedData.price) >= 0)) {
        callback(null, {
            productPrice: parseInt(scrapedData.price),
            productTitle: scrapedData.name,
            productImage: scrapedData.image
        });
    } else {
        // fs.writeFileSync('dom.html', body);
        logger.log('error', 'page scraping failed', {requestOptions: requestOptions, scrapedData: scrapedData});
        callback('Could not determine price information from page');
    }
}

function handleURLFailure (requestOptions, seller, error, response, body, callback) {
    if (response && response.statusCode) {
        logger.log('error', 'request module', {error: error, responseCode: response.statusCode, requestOptions: requestOptions});
        if (parseInt(response.statusCode) === 404) {
            //if page 404s out when running scheduled jobs
            //remove the link from the queue and unsubscribe user of this product
            handleURL404(requestOptions.url, seller);
        }

    } else {
        logger.log('error', 'request module', {error: error, body: body, requestOptions: requestOptions});
    }

    if (!callback) {
        logger.log('error', 'scraping without a callback');
        return;
    }

    callback('error in scraping');
}

function processURL(url, callback, isBackgroundTask) {
    logger.log('info', 'scrape url', {url: url});
    isBackgroundTask = _.isUndefined(isBackgroundTask) ? false : true;

    var seller = sellerUtils.getSellerFromURL(url);

    if (!isBackgroundTask && !config.sellers[seller]) {
        callback('seller not supported');
        return;
    }

    if (!isBackgroundTask && config.sellers[seller].hasDeepLinking) {
        url = sellerUtils.getDeepLinkURL(seller, url);
    }

    var requestOptions = {
        url: url
    };

    if (config.sellers[seller].requiresUserAgent) {
        requestOptions.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36'
        };
    }

    request(requestOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            handleURLSuccess(requestOptions, isBackgroundTask, seller, response, body, callback);
        } else {
            handleURLFailure(requestOptions, seller, error, response, body, callback);
        }
    });
}

function queueProcess() {
    queue.process(function (job, done) {
        latestJobProcessedAt = moment();
        processURL(job.data.productURL, done, true /*isBackgroundTask*/);
    });
}

function createQueueBindEvents () {
    queue.create({
        handleJobComplete: handleJobComplete
    });
}

function ensureQoS (seller) {
    if (seller !== 'flipkart') {
        return;
    }
    //until kue gets completely reliable, put a watchdog
    //
    var lastProcessInterval = moment().diff(latestJobProcessedAt, 'minutes');
    if (lastProcessInterval > config.QoSCheckInterval) {
        //bouy! Kue has fucked up again!
        //
        logger.log('warning', 'service disrupted at ' + moment().format('MMMM Do YYYY, h:mm:ss a'));
        queue.shutdown(function(err) {
            if (!err) {
                logger.log('info', 'restarting kue.');
                createQueueBindEvents();
                queueProcess();
            }
        });
    } else {
        logger.log('info', 'service running at ' + moment().format('MMMM Do YYYY, h:mm:ss a'));
    }
}

function cronWorker(seller, SellerJobModel) {
    SellerJobModel.get(function(err, sellerJobs) {
        if (err) {
            logger.log('error', 'error getting jobs from db', {err: err, seller: seller});
            return;
        }

        logger.log('info', config.sellerCronWorkerLog, {
            seller: seller,
            sellerJobs: sellerJobs.length
        });

        sellerJobs.forEach(function(sellerJob) {
            sellerJob.seller = seller;
            queue.insert(sellerJob);
        });
    });
}

function createWorkerForSeller (seller, asyncEachCallback) {
    var sellerData = config.sellers[seller];
    var SellerJobModel = sellerUtils.getSellerJobModelInstance(seller);
    var env = process.env.NODE_ENV || 'development';
    new CronJob({
        cronTime: sellerData.cronPattern[env],
        onTick: function() {
            ensureQoS(seller);
            cronWorker(seller, SellerJobModel);
        },
        start: true,
        timeZone: 'Asia/Kolkata'
    });
    asyncEachCallback();
}

function init() {
    if (!config.isCronActive) {
        logger.log('info', '=========== Cron Jobs are disabled =============');
        return;
    }

    createQueueBindEvents();

    //foreach seller, create a cron job
    async.each(_.keys(config.sellers), createWorkerForSeller, queueProcess);
}

function exitHandler(options, err) {
    if (options.cleanup) {
        //graceful shutdown of kue
        queue.shutdown(function(shutDownErr) {
            if (shutDownErr) {
                logger.log('error', 'error in shutting down kue when uncaughtException occured', {error: shutDownErr});
                return;
            }
            logger.log('info', 'Kue is shut down due to an uncaughtException', err || '');
        });

    } else if (options.exit) {
        logger.log('info', 'nodejs process exit successful');
        //exit with success code 0
        process.exit(0);
    }
}

//so the program will not close instantly
process.stdin.resume();
//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {cleanup:true}));
//do something when app is closing
process.on('exit', exitHandler.bind(null, {exit:true}));

exports.init = init;
exports.processURL = processURL;
exports.sendNotifications = sendNotifications;
