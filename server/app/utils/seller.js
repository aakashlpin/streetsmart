'use strict';
var mongoose = require('mongoose');
var config = require('../../config/config');
var _ = require('underscore');
var urlLib = require('url');

function getSellerFromURL(url) {
    if (!url) {
        return null;
    }
    var sellers = _.keys(config.sellers);
    return _.find(sellers, function(seller) {
        if (url.indexOf(config.sellers[seller].url) >=0 ) {
            return seller;
        }
    });
}

function getVideoSiteFromURL(url) {
    var videoSites = _.keys(config.videoSites);
    var youtubeDLSites = config.youtubeDLSites;
    var locallyProcessedSite = _.find(videoSites, function(site) {
        return (url.indexOf(config.videoSites[site].url) >=0);
    });

    if (locallyProcessedSite) {
        return locallyProcessedSite;
    }

    var purlObject = urlLib.parse(url);
    var host = purlObject.host;
    return _.find(youtubeDLSites, function(youtubeDLSite) {
        return host.indexOf(youtubeDLSite) >= 0;
    });
}

function getDeepLinkURL(seller, url) {
    if (seller === 'amazon') {
        // extract ASIN from the url
        // http://stackoverflow.com/questions/1764605/scrape-asin-from-amazon-url-using-javascript
        // need to &cor=US to prevent 3g delivery price from showing up on Kindle books
        var asin = url.match('/([a-zA-Z0-9]{10})(?:[/?]|$)');
        if (asin && asin[1]) {
            return ('http://www.amazon.in/dp/'+ asin[1]);
        }
        return url;

    } else if (seller === 'flipkart') {
        // http://nodejs.org/api/url.html
        // signature: url.parse(urlStr, [parseQueryString], [slashesDenoteHost])
        var parsedURL = urlLib.parse(url, true);
        var pidQueryString = (parsedURL.query.pid && (parsedURL.query.pid !== undefined)) ? ('?pid=' + parsedURL.query.pid + '&') : '?';
        if (parsedURL.pathname.indexOf('/dl') !== 0) {
            parsedURL.pathname = '/dl' + parsedURL.pathname;
        }
        var normalizedURL = parsedURL.protocol + '//' + parsedURL.host + parsedURL.pathname + pidQueryString + config.sellers.flipkart.key + '=' + config.sellers.flipkart.value;
        return normalizedURL;
    }

    return url;
}

function increaseCounter(counterName) {
    var counterModel = mongoose.model('Counter');
    counterModel.findOne().lean().exec(function(err, doc) {
        var updateQuery = {_id: doc._id};
        var updateObject = {};
        var updateOptions = {};
        updateObject[counterName] = doc[counterName] + 1;
        counterModel.update(updateQuery, updateObject, updateOptions, function() {});
    });
}

module.exports = {
    getSellerFromURL: getSellerFromURL,
    getDeepLinkURL: getDeepLinkURL,
    getVideoSiteFromURL: getVideoSiteFromURL,
    increaseCounter: increaseCounter,
    getSellerJobModelInstance: function(seller) {
        var jobSellerModelName = seller + '_job';
        return mongoose.model(jobSellerModelName);
    },
    getProcessingMode: function(url) {
        //2 modes. 'seller' or 'site'
        if (getVideoSiteFromURL(url)) {
            return 'site';
        }
        return 'seller';
    },
    isLegitSeller: function(seller) {
        if (!seller) {
            return false;
        }
        var sellers = _.keys(config.sellers);
        return !!_.find(sellers, function(legitSeller) {
            return seller.trim().toLowerCase() === legitSeller;
        });

    }
};
