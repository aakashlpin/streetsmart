var fs = require('fs');
var kue = require('kue');
var jobs = kue.createQueue();
var jsdom  = require('jsdom');
var config = require('../../config/config');

kue.app.listen(3001);

function newJob (name){
    name = name || 'Default_Name';
    var job = jobs.create('scraper', {
        name: name
    });

    job
    .on('complete', function (){
        console.log('Job', job.id, 'with name', job.data.name, 'is done');
    })
    .on('failed', function (){
        console.log('Job', job.id, 'with name', job.data.name, 'has failed');
    })

    job.save();
}

jobs.process('scraper', function (job, done){
    /* carry out all the job function here */
    processURL(done);
});

var processURL = function(done) {
    jsdom.env(
        "http://www.flipkart.com/apple-iphone-5s/p/itmdv6f75dyxhmt4?pid=MOBDPPZZPXVDJHSQ&otracker=variants",
        ["http://code.jquery.com/jquery.js"],
        function (errors, window) {
            var price = window.$("meta[itemprop='price']").attr('content'),
            currency = window.$("meta[itemprop='priceCurrency']").attr('content'),
            name = window.$('[itemprop="name"]').text().replace(/^\s+|\s+$/g,'', ''),
            image = window.$('.product-image').attr('src');

            console.log(name, currency, price, image);
            done && done();
        }
    );

};

var procesQueue = function() {
    console.log('processing queue');
};

var init = function() {
    setInterval(function (){
        newJob('Scrape iPhone product page');
    }, config.requestTimeout);

}

exports.init = init;
exports.processURL = processURL;
exports.processQueue = procesQueue;
