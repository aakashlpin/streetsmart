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
var moment = require('moment');
var queue;
var latestJobProcessedAt;

// Jobs = mongoose.model('Job');
kue.app.listen(config.kuePort);

function queueJob (jobData) {
    //title is a field necessary for the kue lib
    jobData.title = 'Processing ' + jobData.productName;
    delete jobData.productPriceHistory;

    var job = queue.create('scraper', jobData);
    job.save();
}

function removeJob(job) {
    job.remove(function(err) {
        if (err) {
            logger.log('warn', 'failed to remove completed job', {id: job.id});
            return;
        }
        logger.log('info', config.jobRemovedLog, {id: job.id});
    });
}

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

function handleJobError (id) {
    logger.log('info', 'job error event received', {id: id});
}

function handleJobFailure (id) {
    kue.Job.get(id, function(err, job) {
        if (err) {
            logger.log('error', 'error getting job id when job failed', {id: id});
            return;
        }
        removeJob(job);
    });
}

function shouldSendAlert(data) {
    console.log('comes inside shouldSendAlert');
    //if price is same, no alert
    if (data.storedPrice === data.scrapedPrice) {
        return false;
    }
    console.log('price not same');

    //if price is higher, no alert
    if (data.storedPrice < data.scrapedPrice) {
        return false;
    }

    console.log('price lower');

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

    console.log('min diff fulfilled');

    //wow. you really want the alert. Ok. Last check!

    //if the alert about to be sent is same as the last one, no alert
    if (data.alertToPrice === data.scrapedPrice) {
        return false;
    }

    console.log('last alert was different');

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
    kue.Job.get(id, function(err, job) {
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

function processURL(url, callback, isBackgroundTask) {
    logger.log('info', 'scrape url', {url: url});

    isBackgroundTask = isBackgroundTask || false;

    var seller = sellerUtils.getSellerFromURL(url);

    if (!config.sellers[seller]) {
        callback('seller not supported');
        return;
    }

    if (!isBackgroundTask && config.sellers[seller].hasDeepLinking) {
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

            //TODO support isBackgroundTask
            var scrapedData = require('../sellers/' + seller)($, isBackgroundTask);
            if (callback) {
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

        } else {
            if (response && response.statusCode) {
                logger.log('error', 'request module', {error: error, responseCode: response.statusCode, requestOptions: requestOptions});
                if (parseInt(response.statusCode) === 404) {
                    //if page 404s out when running scheduled jobs
                    //remove the link from the queue and unsubscribe user of this product
                    handleURL404(url, seller);
                }

            } else {
                logger.log('error', 'request module', {error: error, body: body, requestOptions: requestOptions});
            }

            if (callback) {
                callback('error in scraping');
            }
        }
    });
}

function queueGracefulShutDown(callback) {
    logger.log('info', 'about to shut down queue');
    queue.shutdown(callback, 5000);
}

function queueProcess() {
    queue.process('scraper', function (job, done) {
        latestJobProcessedAt = moment();
        processURL(job.data.productURL, done, true /*isBackgroundTask*/);
    });
}

function queueInstance () {
    queue = kue.createQueue();
    queue.on('job error', handleJobError);
    queue.on('job failed', handleJobFailure);
    queue.on('job complete', handleJobComplete);
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
        logger.log('info', 'service disrupted at ' + moment().format('MMMM Do YYYY, h:mm:ss a'));
        queueGracefulShutDown(function(err) {
            if (!err) {
                logger.log('info', 'restarting kue.');
                queueInstance();
                queueProcess();
            }
        });
    } else {
        logger.log('info', 'service running at ' + moment().format('MMMM Do YYYY, h:mm:ss a'));
    }
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
                queueJob(sellerJob);
            });
        });
    }

    function createWorkerForSeller (seller, asyncEachCallback) {
        var sellerData = sellers[seller];
        var SellerJobModel = sellerUtils.getSellerJobModelInstance(seller);
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

    queueInstance();

    //foreach seller, create a cron job
    async.each(_.keys(sellers), createWorkerForSeller, queueProcess);
}

process.stdin.resume();//so the program will not close instantly

function exitHandler(options) {
    if (options.cleanup) {
        //graceful shutdown of kue
        queueGracefulShutDown(function(err) {
            logger.log('info', 'Kue is shut down due to an uncaughtException', err || '');
        });

    } else if (options.exit) {
        logger.log('info', 'nodejs process exit successful');
        //exit with success code 0
        process.exit(0);
    }
}

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {cleanup:true}));
//do something when app is closing
process.on('exit', exitHandler.bind(null, {exit:true}));

exports.init = init;
exports.processURL = processURL;
exports.sendNotifications = sendNotifications;
