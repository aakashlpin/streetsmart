'use strict';
var kue = require('kue');
var jsdom  = require('jsdom');
// var fs = require('fs');
var  _ = require('underscore');
var config = require('../../config/config');
var CronJob = require('cron').CronJob;
var mongoose = require('mongoose');
var Emails = require('./emails');

// var jquery = fs.readFileSync(__dirname+'/../../jquery.js', 'utf-8');
var jobsQ = kue.createQueue(),
Jobs = mongoose.model('Job');

kue.app.listen(3001);

function newJob (jobData) {
    var job = jobsQ.create('scraper', {
        name: jobData.productName,
        title: 'Processing ' + jobData.productName + ' for ' + jobData.email,
        jobData: jobData
    });

    job
    .on('complete', function (result){
        jobData = job.data.jobData;
        var jobQuery = {email: jobData.email, productURL: jobData.productURL};
        Jobs.getOneGeneric(jobQuery, function(err, jobQueryResult) {
            if (err) {
                console.log('jobQuery failed!! OMG I have lost faith in humanity');
                return;
            }

            var previousPrice = parseInt(jobQueryResult.currentPrice, 10);
            var newPrice = parseInt(result.price, 10);

            if (previousPrice !== newPrice) {
                //send out an email
                //modify the DB's currentPrice field and productPriceHistory array
                var emailUser = {email: jobData.email};
                var emailProduct = _.extend(jobData, {currentPrice: newPrice});
                Emails.sendNotifier(emailUser, emailProduct, function(err, message) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(message);
                    }
                });
            }

            Jobs.updateNewPrice(jobQuery, {price: newPrice}, function(err, updatedJob) {
                if (err) {
                    console.log('updating price failed => ', err);
                }
                if (updatedJob) {
                    console.log('entry in the db updated ', updatedJob);
                }
            });
        });
    })
    .on('failed', function (){
        console.log('Job', job.id, 'with name', job.data.name, 'has failed');
    });

    job.save();
}

function processURL(url, callback) {
    jsdom.env(url, ['http://code.jquery.com/jquery.js'], function (errors, window) {
        var $, price, currency, name, image;
        $ = window.jQuery;
        if (typeof $ === void 0)  {
            callback('Error: jQuery couldn\'t load');
            return;
        }

        price = $('meta[itemprop="price"]').attr('content');
        currency = $('meta[itemprop="priceCurrency"]').attr('content');
        name = $('[itemprop="name"]').text().replace(/^\s+|\s+$/g,'', '');
        image = $('.product-image').attr('src');

        var callBackData = {
            price: price,
            currency: currency,
            name: name,
            image: image
        };

        if (callback) {
            callback(null, callBackData);
        }
    });
}

function init() {
    new CronJob(config.cronPattern, function(){
        Jobs.getActiveJobs(function(err, activeJobs) {
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
        done('Couldn\'t find jobData to scrape');
    }
});

exports.init = init;
exports.processURL = processURL;
