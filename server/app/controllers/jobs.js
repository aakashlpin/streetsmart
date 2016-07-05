'use strict';
var request = require('request');
var parser  = require('cheerio');
var  _ = require('underscore');
_.str = require('underscore.string');
var config = require('../../config/config');
var CronJob = require('cron').CronJob;
var logger = require('../../logger').logger;
var sellerUtils = require('../utils/seller');
var async = require('async');
var moment = require('moment');
var queue = require('../lib/queue');
var bgTask = require('../lib/background');
var offloadStaticFiles = require('../lib/offloadStaticFiles');
var Store = require('../lib/store').Store;
var dataStore = new Store();
var latestJobProcessedAt;
var env = process.env.NODE_ENV || 'development';

// var fs = require('fs');

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
    if (_.isUndefined(scrapedData) ||
     _.isUndefined(scrapedData.name) ||
     _.isUndefined(scrapedData.price ||
     _.isUndefined(scrapedData.image))) {
        logger.log('error', 'page scraping failed', {requestOptions: requestOptions, price: scrapedData ? scrapedData.price : null});
        return callback('Sorry! We were unable to process this page!');
    }

    if (scrapedData.price && (parseInt(scrapedData.price) >= 0)) {
        var cbData = {
            productPrice: parseInt(scrapedData.price),
            productName: scrapedData.name,
            productImage: scrapedData.image,
            seller: config.sellers[seller].name
        };

        dataStore.set(requestOptions.url, cbData);
        callback(null, cbData);
    } else {
        // fs.writeFileSync('dom.html', body);
        logger.log('error', 'page scraping failed', {requestOptions: requestOptions, price: scrapedData ? scrapedData.price : null});
        callback('Sorry! We were unable to process this page!');
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

    callback('Sorry! We were unable to process this page! Please try again.');
}

function processURL(url, callback, isBackgroundTask) {
    if (!url) {
        return callback('Sorry! This website is not supported at the moment.');
    }

    logger.log('info', 'scrape url', {url: url});
    isBackgroundTask = _.isUndefined(isBackgroundTask) ? false : true;

    var seller = sellerUtils.getSellerFromURL(url);

    if (!isBackgroundTask && !config.sellers[seller]) {
        callback('Sorry! This website is not supported at the moment.');
        return;
    }

    if (!isBackgroundTask && config.sellers[seller].hasDeepLinking) {
        //if it's a background task then the URL will already be a deep linked url
        url = sellerUtils.getDeepLinkURL(seller, url);
    }

    //see if this url data exists in memory
    dataStore.get(url, function (err, urlData) {
        if (err || !urlData) {
            //proceed with http request
            var requestOptions = {
                url: url,
                timeout: 5000
            };

            if (config.sellers[seller].requiresUserAgent) {
                requestOptions.headers = {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.94 Safari/537.36'
                };
            }

            if (config.sellers[seller].requiresCookies) {
                requestOptions.jar = true;
            }

            if(config.sellers[seller].requiresProxy) {
                requestOptions.proxy = config.proxy;
            }

            request(requestOptions, function(error, response, body) {
                if (!error && response.statusCode === 200) {
                    handleURLSuccess(requestOptions, isBackgroundTask, seller, response, body, callback);
                } else {
                    handleURLFailure(requestOptions, seller, error, response, body, callback);
                }

                if (isBackgroundTask) {
                    latestJobProcessedAt = moment();
                }
            });
        } else {
            //send back the existing data
            callback(null, urlData);
        }
    });
}

function queueProcess() {
    queue.process(function (job, done) {
        processURL(job.data.productURL, done, true /*isBackgroundTask*/);
    });
}

function createQueueBindEvents () {
    queue.create();
}

function ensureQoS (seller, callback) {
    if (seller !== 'flipkart') {
        return callback(null, true);
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
                callback(null, false);
            }
        });
    } else {
        logger.log('info', 'service running at ' + moment().format('MMMM Do YYYY, h:mm:ss a'));
        callback(null, true);
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
    new CronJob({
        cronTime: sellerData.cronPattern[env],
        onTick: function() {
            ensureQoS(seller, function (err, active) {
                if (active) {
                    //is service is not active, lets process queue before adding more
                    cronWorker(seller, SellerJobModel);
                }
            });
        },
        start: true,
        timeZone: 'Asia/Kolkata'
    });
    asyncEachCallback();
}

function createCronTabForAllProducts () {
    //immediately process all items
    bgTask.processAllProducts();

    // set up cron job
    new CronJob({
        cronTime: config.processAllProductsInterval[env],
        onTick: bgTask.processAllProducts,
        start: true,
        timeZone: 'Asia/Kolkata'
    });
}

function createCronTabForDeals () {

    bgTask.refreshDeal();

    //set up cron job
    new CronJob({
        cronTime: config.processDealsInterval[env],
        onTick: bgTask.refreshDeal,
        start: true,
        timeZone: 'Asia/Kolkata'
    });
}

function createSearchForFullContacts () {
    bgTask.getFullContactByEmail();

    //set up cron job
    new CronJob({
        cronTime: config.processFullContactInterval[env],
        onTick: bgTask.getFullContactByEmail,
        start: true,
        timeZone: 'Asia/Kolkata'
    });
}

function createCronTabForRemoteSync () {
    offloadStaticFiles.sync();

    //set up cron job
    new CronJob({
        cronTime: config.processRemoteSyncInterval[env],
        onTick: offloadStaticFiles.sync,
        start: true,
        timeZone: 'Asia/Kolkata'
    });
}

function createAndSendDailyReport () {
    //set up cron job
    new CronJob({
        cronTime: config.createAndSendDailyReportInterval[env],
        onTick: bgTask.createAndSendDailyReport,
        start: true,
        timeZone: 'Asia/Kolkata'
    });
}

function init() {
    //for request from home page, pre-process all products and keep the data in memory
    createCronTabForAllProducts();

    createCronTabForRemoteSync();

    if (!config.isCronActive) {
        logger.log('info', '=========== Cron Jobs are disabled =============');
        return;
    }

    //for sending price drop emails, keep deals ready
    createCronTabForDeals();

    createQueueBindEvents();

    createSearchForFullContacts();

    createAndSendDailyReport();

    //foreach seller, create a cron job
    async.each(_.keys(config.sellers), createWorkerForSeller, queueProcess);
}

function exitHandler(options, err) {
    if (options.cleanup) {
        //graceful shutdown of kue
        if (queue.getInstance()) {
            queue.shutdown(function(shutDownErr) {
                if (shutDownErr) {
                    logger.log('error', 'error in shutting down kue when uncaughtException occured', {error: shutDownErr});
                    return;
                }
                logger.log('info', 'Kue is shut down due to an uncaughtException', err || '');
            });
        }

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
