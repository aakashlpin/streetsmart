'use strict';
var mongoose = require('mongoose');
var config = require('../../config/config');
var _ = require('underscore');

module.exports = {
    getSellerFromURL: function(url) {
        var sellers = _.keys(config.sellers);
        return _.find(sellers, function(seller) {
            if (url.indexOf(config.sellers[seller].url) >=0 ) {
                return seller;
            }
        });
    },
    getSellerJobModelInstance: function(seller) {
        var jobSellerModelName = seller + '_job';
        return mongoose.model(jobSellerModelName);
    }
};
