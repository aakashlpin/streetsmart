'use strict';

var kue = require('kue');
var jsdom  = require('jsdom');
var  _ = require('underscore');
var config = require('../../config/config');
var CronJob = require('cron').CronJob;
var mongoose = require('mongoose');
var Emails = require('./emails');

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
    .on('complete', function (){
        console.log('Job', job.id, 'with name', job.data.name, 'is done');
        //job.result will contain the callback result after scraping
        var jobData = job.data.jobData;
        var jobQuery = {query: {email: jobData.email, productURL: jobData.productURL}};
        Jobs.get(jobQuery, function(err, jobQueryResult) {
            if (err) {
                console.log('jobQuery failed!! OMG I have lost faith in humanity');
                return;
            }
            var previousPrice = jobQueryResult.currentPrice;
            var newPrice = job.result.price;
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

            } else {
                //make an entry in the DB's productPriceHistory array
            }
        });
    })
    .on('failed', function (){
        console.log('Job', job.id, 'with name', job.data.name, 'has failed');
    });

    job.save();
}

function processURL(url, callback) {
    jsdom.env(url, ['http://code.jquery.com/jquery.js'], function (errors, window) {
        var price = window.$('meta[itemprop="price"]').attr('content'),
        currency = window.$('meta[itemprop="priceCurrency"]').attr('content'),
        name = window.$('[itemprop="name"]').text().replace(/^\s+|\s+$/g,'', ''),
        image = window.$('.product-image').attr('src');

        var callBackData = {
            price: price,
            currency: currency,
            name: name,
            image: image
        };

        if (callback) {
            callback(errors, callBackData);
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
    processURL(job.jobData.productURL, done);
});

exports.init = init;
exports.processURL = processURL;
