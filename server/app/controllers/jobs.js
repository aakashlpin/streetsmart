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

var jobsQ = kue.createQueue(),
Jobs = mongoose.model('Job');

kue.app.listen(config.kuePort);

function newJob (jobData) {
    var job = jobsQ.create('scraper', {
        url: jobData.productURL,
        name: jobData.productName,
        title: 'Processing ' + jobData.productName + ' for ' + jobData.email
    });

    job
    .on('complete', function (result) {
        logger.log('info', 'scraping job completed', {result: result});
        var jobQuery = {email: jobData.email, productURL: jobData.productURL};
        var previousPrice = parseInt(jobData.currentPrice, 10);
        var newPrice = parseInt(result.price, 10);

        if (_.isNaN(newPrice)) {
            logger.log('warning', 'price parseInt resulted as NaN. original data attached', {price: result.price});
            return;
        }

        if (jobData.isActive && (previousPrice !== newPrice)) {
            //send out an email only if user is still tracking this product
            //modify the DB's currentPrice field and productPriceHistory array
            var emailUser = {email: jobData.email};
            var seller = sellerUtils.getSellerFromURL(jobData.productURL);
            var emailProduct = _.extend(jobData, {
                currentPrice: newPrice,
                oldPrice: previousPrice,
                seller: _.str.capitalize(seller),
                measure: previousPrice > newPrice ? 'dropped': 'increased',
                trackURL: config.server + '/track/' + seller + '/' + jobData._id
            });

            //send notification email for price change
            Emails.sendNotifier(emailUser, emailProduct, function(err, message) {
                if (err) {
                    logger.log('error', 'while sending notifier email', {err: err});
                } else {
                    logger.log('silly', 'successfully sent notifier email', {message: message});
                    //update the emails counter
                    sellerUtils.increaseCounter('emailsSent');
                }
            });
        }

        Jobs.updateNewPrice(jobQuery, {price: newPrice}, function(err, updatedJob) {
            if (err) {
                logger.log('error', 'updating price after scraping failed', {err: err});
            }
            if (updatedJob) {
                logger.log('silly', 'documents updated after scraping', {count: updatedJob});
            }
        });
    })
    .attempts(3)
    .backoff({type:'exponential'})
    .save();
}

jobsQ.on('job complete', function(id) {
    //free up the memory
    kue.Job.get(id, function(err, job) {
        if (err) {
            return;
        }
        job.remove(function(err) {
            if (err) {
                logger.log('warn', 'failed to remove completed job #%d', job.id);
                return;
            }
            logger.log('info', 'removed completed job #%d', job.id);
        });
    });
});

function processURL(url, callback) {
    if (process.env.NODE_ENV !== 'production') {
        logger.profile('scrape');
    }

    logger.log('info', 'scrape', {url: url});

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
                        price: scrapedData.price,
                        name: scrapedData.name,
                        image: scrapedData.image
                    });
                } else {
                    callback('Could not determine price information from page');
                }
            }

        } else {
            logger.log('error', 'request module', {error: error, response: response});
            if (callback) {
                callback('error in scraping');
            }
        }

        if (process.env.NODE_ENV !== 'production') {
            logger.profile('scrape');
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
        if (job.data.url) {
            processURL(job.data.url, done);
        } else {
            logger.log('error', 'jobQ scraper processing failed', {jobObject: job});
            done('Couldn\'t find jobURL to scrape');
        }
    });
}

exports.init = init;
exports.processURL = processURL;
