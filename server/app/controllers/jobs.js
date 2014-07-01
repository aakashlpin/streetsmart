'use strict';
var kue = require('kue');
var request = require('request');
var parser  = require('cheerio');
var  _ = require('underscore');
var config = require('../../config/config');
var CronJob = require('cron').CronJob;
var mongoose = require('mongoose');
var Emails = require('./emails');
var logger = require('../../logger').logger;
var sellerUtils = require('../utils/seller');

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
    .on('complete', function (result){
        logger.log('info', 'scraping job completed', {result: result});
        var jobQuery = {email: jobData.email, productURL: jobData.productURL};
        var previousPrice = parseInt(jobData.currentPrice, 10);
        var newPrice = parseInt(result.price, 10);

        if (_.isNaN(newPrice)) {
            logger.log('error', 'price parseInt resulted as NaN. original data attached', {price: result.price});
            return;
        }

        if (previousPrice !== newPrice) {
            //send out an email
            //modify the DB's currentPrice field and productPriceHistory array
            var emailUser = {email: jobData.email};
            var emailProduct = _.extend(jobData, {
                currentPrice: newPrice,
                oldPrice: previousPrice,
                measure: previousPrice > newPrice ? 'dropped': 'increased'
            });
            Emails.sendNotifier(emailUser, emailProduct, function(err, message) {
                if (err) {
                    logger.log('error', 'while sending notifier email', {err: err});
                } else {
                    logger.log('silly', 'successfully sent notifier email', {message: message});
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

jobsQ.on('job complete', function(id, result) {
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
    var requestOptions = {
        url: url
    };

    if (seller === 'jabong') {
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
            callback && callback(null, {
                price: scrapedData.price,
                name: scrapedData.name,
                image: scrapedData.image
            });

        } else {
            logger.log('error', 'request module', {error: error, response: response});
            callback && callback('error in scraping');
        }

        if (process.env.NODE_ENV !== 'production') {
            logger.profile('scrape');
        }
    });
}

function init() {
    new CronJob(config.cronPattern, function(){
        Jobs.getActiveJobs(function(err, activeJobs) {
            if (err) {
                logger.log('error', 'unable to get active jobs from db', {err: err});
                return;
            }

            logger.log('info', 'active jobs', {count: activeJobs.length});

            activeJobs.forEach(function(activeJob) {
                newJob(activeJob);
            });

        });
    }, null, true, 'Asia/Kolkata');
}

jobsQ.process('scraper', function (job, done) {
    if (job.data.url) {
        processURL(job.data.url, done);
    } else {
        logger.log('error', 'jobQ scraper processing failed', {jobObject: job});
        done('Couldn\'t find jobURL to scrape');
    }
});

exports.init = init;
exports.processURL = processURL;
