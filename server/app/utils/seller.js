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
        if (config.sellers[seller].otherUrls) {
          return _.find(config.sellers[seller].otherUrls, function (otherUrl) {
              return url.indexOf(otherUrl) >= 0 ? seller : null;
          })
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
        var asin = url.match('/([a-zA-Z0-9]{10})(?:[/?]|$)');
        if (asin && asin[1]) {
            return ('http://www.amazon.in/dp/'+ asin[1]);
        }
        return url;

    } else if (seller === 'flipkart') {
        // http://nodejs.org/api/url.html
        // signature: url.parse(urlStr, [parseQueryString], [slashesDenoteHost])
        var parsedURL = urlLib.parse(url, true);
        var pidQueryString = (parsedURL.query.pid && (parsedURL.query.pid !== undefined)) ? ('?pid=' + parsedURL.query.pid) : '';
        var affiliateHost = parsedURL.host;
        if (parsedURL.pathname.indexOf('/dl') !== 0) {
            parsedURL.pathname = '/dl' + parsedURL.pathname;
        }
        affiliateHost = affiliateHost.replace('www.flipkart.com', 'dl.flipkart.com');
        var normalizedURL = parsedURL.protocol + '//' + affiliateHost + parsedURL.pathname + pidQueryString;
        return normalizedURL;

    } else if (seller === 'snapdeal') {
        //snapdeal has a few junk chars in `hash`
        //"#bcrumbSearch:AF-S%20Nikkor%2050mm%20f/1.8G"
        //so lets ignore the hash altogether and return url until pathname
        var pUrl = urlLib.parse(url, true);
        return (pUrl.protocol + '//' + pUrl.host + pUrl.pathname);
    }

    return url;
}

function getURLWithAffiliateId(url) {
    var urlSymbol = url.indexOf('?') > 0 ? '&': '?';
    var seller = getSellerFromURL(url);
    var sellerKey = config.sellers[seller].key,
    sellerValue = config.sellers[seller].value,
    sellerExtraParams = config.sellers[seller].extraParams;

    if (sellerKey && sellerValue) {
        var stringToMatch = sellerKey + '=' + sellerValue;
        var urlWithAffiliate;
        if (url.indexOf(stringToMatch) > 0) {
            urlWithAffiliate = url;
        } else {
            urlWithAffiliate = url + urlSymbol + stringToMatch;
        }

        //for snapdeal, they have a offer id param as well
        //in the config file, I've put it as a query string
        //so simply appending it here would work
        if (sellerExtraParams) {
            return urlWithAffiliate + sellerExtraParams;
        } else {
            return urlWithAffiliate;
        }
    }
    return url;
}

function increaseCounter(counterName) {
    var counterModel = mongoose.model('Counter');
    counterModel.findOne().lean().exec(function(err, doc) {
        if (!doc) {
          return;
        }
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
    getURLWithAffiliateId: getURLWithAffiliateId,
    getSellerJobModelInstance: function(seller) {
        var jobSellerModelName = seller + '_job';
        return mongoose.model(jobSellerModelName);
    },
    getSellerProductPriceHistoryModelInstance: function (seller) {
        return mongoose.model(seller + '_product_price_history');
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
