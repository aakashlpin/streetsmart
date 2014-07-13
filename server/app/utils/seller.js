'use strict';
var mongoose = require('mongoose');
var config = require('../../config/config');
var _ = require('underscore');
var urlLib = require('url');

function getSellerFromURL(url) {
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

module.exports = {
    getSellerFromURL: getSellerFromURL,
    getVideoSiteFromURL: getVideoSiteFromURL,
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
    }
};
