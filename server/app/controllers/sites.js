'use strict';
var request = require('request');
var  _ = require('underscore');
_.str = require('underscore.string');
var config = require('../../config/config');
var logger = require('../../logger').logger;
var sellerUtils = require('../utils/seller');
var mongoose = require('mongoose');
var SiteModel = mongoose.model('Site');

function processSite(url, res) {
    logger.log('info', 'scrape', {url: url});
    var site = sellerUtils.getVideoSiteFromURL(url);

    setTimeout(function() {
        //log the request in the db at the end of current event queue
        SiteModel.post({site: site, url: url}, function() {});
    }, 0);

    var requestOptions = {
        url: url
    };

    if (site.indexOf('.') >= 0) {
        //it's one of the websites which youtube-dl can get for us
        require('../sites/youtube-dl')(requestOptions, res);
        return;
    }

    if (config.videoSites[site].requiresUserAgent) {
        requestOptions.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36'
        };
    }

    request(requestOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            require('../sites/' + site)(body, res);

        } else {
            logger.log('error', 'request module', {error: error, response: response});
            res.jsonp({status: 'error'});
        }
    });
}

exports.processSite = processSite;
