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
var latestJobProcessedAt;
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
    queue.create();
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