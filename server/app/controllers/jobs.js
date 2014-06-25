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

var jobsQ = kue.createQueue(),
Jobs = mongoose.model('Job');

kue.app.listen(config.kuePort);

function newJob (jobData) {
    var job = jobsQ.create('scraper', {
        name: jobData.productName,
        title: 'Processing ' + jobData.productName + ' for ' + jobData.email,
        jobData: jobData
    });

    job
    .on('complete', function (result){
        logger.log('info', 'scraping job completed', {result: result});
        jobData = job.data.jobData;
        var jobQuery = {email: jobData.email, productURL: jobData.productURL};
        Jobs.getOneGeneric(jobQuery, function(err, jobQueryResult) {
            if (err) {
                logger.log('error', 'jobQuery failed', {err: err});
                return;
            }

            var previousPrice = parseInt(jobQueryResult.currentPrice, 10);
            var newPrice = parseInt(result.price, 10);

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
        });
    })
    .on('failed', function (){
        logger.log('error', 'scraping job failed');
        //move the job to inactive state
        //this will re-enqueue the job
        job.state('inactive').priority('high').save();
    });

    job.save();
}

function processURL(url, callback) {
    if (process.env.NODE_ENV !== 'production') {
        logger.profile('scrape');
    }

    logger.log('info', 'scrape', {url: url});

    request.get(url, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var $, price, currency, name, image;
            $ = parser.load(body);

            if (!callback) {
                logger.log('error', 'scraping without a callback');
            }

            price = $('meta[itemprop="price"]').attr('content');
            currency = $('meta[itemprop="priceCurrency"]').attr('content');
            name = $('[itemprop="name"]').text().replace(/^\s+|\s+$/g, '');
            image = $('.product-image').attr('src');

            callback && callback(null, {
                price: price,
                currency: currency,
                name: name,
                image: image
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

jobsQ.process('scraper', function (job, done){
    if (job.data.jobData) {
        processURL(job.data.jobData.productURL, done);
    } else {
        logger.log('error', 'jobQ scraper processing failed', {jobObject: job});
        done('Couldn\'t find jobData to scrape');
    }
});

exports.init = init;
exports.processURL = processURL;
