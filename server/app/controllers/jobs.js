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

function handleURLSuccess (requestOptions, isBackgroundTask, hasMicroService, seller, response, body, callback) {
    if (!callback) {
        logger.log('error', 'scraping without a callback');
        return;
    }

    var scrapedData, productURL;

    if (hasMicroService) {
        logger.log('info', 'typeof body from microservice', typeof body);
        try {
          if (typeof body !== 'object') {
              body = JSON.parse(body);
          }
        } catch (e) {}

        logger.log('info', 'scraped body from microservice', body);

        scrapedData = body;
        productURL = requestOptions.form.url;

    } else {
        var $ = parser.load(body);
        scrapedData = require('../sellers/' + seller)($, isBackgroundTask);
        productURL = requestOptions.url;
    }

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

        dataStore.set(productURL, cbData);
        callback(null, cbData);

    } else {
        // fs.writeFileSync('dom.html', body);
        logger.log('error', 'page scraping failed', {requestOptions: requestOptions, price: scrapedData ? scrapedData.price : null});
        if (isBackgroundTask) {
          sellerUtils
          .getSellerJobModelInstance(seller)
          .update({productURL: productURL}, {$inc: {failedAttempts: 1}}, {}, function (err) {
            if (err) {
              logger.log('error', 'unable to increase failedAttempts', {error: err, productURL: productURL});
            } else {
              logger.log('info', 'increased failedAttempts', {productURL: productURL});
            }
          })
        }
        callback('Sorry! We were unable to process this page!');
    }
}

function handleURLFailure (requestOptions, hasMicroService, seller, error, response, body, callback) {
    var productURL = hasMicroService ? requestOptions.form.url : requestOptions.url;

    if (response && response.statusCode) {
        logger.log('error', 'request module', {error: error, responseCode: response.statusCode, requestOptions: requestOptions});
        if (parseInt(response.statusCode) === 404) {
            //if page 404s out when running scheduled jobs
            //remove the link from the queue and unsubscribe user of this product
            handleURL404(productURL, seller);
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
                timeout: 10000
            };

            var hasMicroService = config.sellers[seller].hasMicroService;

            if (hasMicroService) {
                requestOptions.url = 'http://' + seller + '.cheapass.in/'
                requestOptions.method = 'POST';
                requestOptions.form = {
                  API_KEY: 'fuck_you_flipkart',
                  url: url,
                };

            } else {
                if (config.sellers[seller].requiresUserAgent) {
                    requestOptions.headers = {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36'
                    };
                }

                if (config.sellers[seller].requiresCookies) {
                    requestOptions.jar = true;
                }

                if(config.sellers[seller].requiresProxy) {
                    requestOptions.proxy = config.proxy;
                }
            }

            request(requestOptions, function(error, response, body) {
                if (!error && response.statusCode === 200) {
                    handleURLSuccess(requestOptions, isBackgroundTask, hasMicroService, seller, response, body, callback);
                } else {
                    handleURLFailure(requestOptions, hasMicroService, seller, error, response, body, callback);
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

// function ensureQoS (seller, callback) {
//     if (seller !== 'amazon') {
//         return callback(null, true);
//     }
//     //until kue gets completely reliable, put a watchdog
//     //
//     var lastProcessInterval = moment().diff(latestJobProcessedAt, 'minutes');
//     if (lastProcessInterval > config.QoSCheckInterval) {
//         //bouy! Kue has fucked up again!
//         //
//         logger.log('warning', 'service disrupted at ' + moment().format('MMMM Do YYYY, h:mm:ss a'));
//         queue.shutdown(function(err) {
//             if (!err) {
//                 logger.log('info', 'restarting kue.');
//                 createQueueBindEvents();
//                 queueProcess();
//                 callback(null, false);
//             }
//         });
//     } else {
//         logger.log('info', 'service running at ' + moment().format('MMMM Do YYYY, h:mm:ss a'));
//         callback(null, true);
//     }
// }

function cronWorker(seller, SellerJobModel) {
    SellerJobModel.get(function(err, sellerJobs) {
        if (err) {
            logger.log('error', 'error getting jobs from db', {err: err, seller: seller});
            return;
        }

        async.eachSeries(sellerJobs, function(sellerJob, callback) {
            sellerJob.seller = seller;
            queue.insert(sellerJob, function () {
              callback();
            });
        }, function (err) {
            if (err) {
                logger.log('error', config.sellerCronWorkerLog);
            }

            logger.log('info', config.sellerCronWorkerLog, {
                seller: seller,
                sellerJobs: sellerJobs.length
            });
        })
    });
}

function createWorkerForSeller (seller, asyncEachCallback) {
    var sellerData = config.sellers[seller];
    var SellerJobModel = sellerUtils.getSellerJobModelInstance(seller);
    new CronJob({
        cronTime: sellerData.cronPattern[env],
        onTick: function() {
          cronWorker(seller, SellerJobModel);
            // ensureQoS(seller, function (err, active) {
            //     if (active) {
            //         //is service is not active, lets process queue before adding more
            //
            //     }
            // });
        },
        start: true,
        timeZone: 'Asia/Kolkata'
    });
    asyncEachCallback();
}

function createCronTabForAllProducts () {
    setTimeout(function () {
      //process all items after 2 mins
      bgTask.processAllProducts();
    }, 5 * 60 * 1000)

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

// function generateAmazonSalesReport () {
//   //set up cron job
//   new CronJob({
//       cronTime: config.generateAmazonSalesReportInterval[env],
//       onTick: bgTask.generateAmazonSalesReport,
//       start: true,
//       timeZone: 'Asia/Kolkata'
//   });
// }
//
//

function generateReviewEmailForAlerts () {
    //set up cron job
    new CronJob({
        cronTime: config.generateReviewEmailForAlertsInterval[env],
        onTick: bgTask.generateReviewEmailForAlertsTask,
        start: true,
        timeZone: 'Asia/Kolkata'
    });
}

function init() {
    // for request from home page, pre-process all products and keep the data in memory
    createCronTabForAllProducts();

    createCronTabForRemoteSync();

    generateReviewEmailForAlerts();

    if (!config.isCronActive) {
        logger.log('info', '=========== Cron Jobs are disabled =============');
        return;
    }

    // for sending price drop emails, keep deals ready
    // createCronTabForDeals();

    createQueueBindEvents();

    createSearchForFullContacts();

    createAndSendDailyReport();

    // generateAmazonSalesReport();

    //foreach seller, create a cron job
    async.each(_.filter(_.keys(config.sellers), function (seller) {
      return config.sellers[seller].isCronActive;
    }), createWorkerForSeller, queueProcess);
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

// so the program will not close instantly
process.stdin.resume();
// catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {cleanup:true}));
// do something when app is closing
process.on('exit', exitHandler.bind(null, {exit:true}));

exports.init = init;
exports.processURL = processURL;
