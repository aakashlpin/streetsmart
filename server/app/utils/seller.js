'use strict';
var mongoose = require('mongoose');
module.exports = {
    getSellerFromURL: function(url) {
        if (url.indexOf('flipkart.com') >= 0) {
            return 'flipkart';
        } else if (url.indexOf('amazon.in') >= 0) {
            return 'amazon';
        } else if (url.indexOf('jabong.com') >= 0) {
            return 'jabong';
        } else if (url.indexOf('myntra.com') >= 0) {
            return 'myntra';
        } else if (url.indexOf('infibeam.com') >= 0) {
            return 'infibeam';
        } else if (url.indexOf('snapdeal.com') >= 0) {
            return 'snapdeal';
        } else if (url.indexOf('fabfurnish.com') >= 0) {
            return 'fabfurnish';
        } else if (url.indexOf('bajaao.com') >= 0) {
            return 'bajaao';
        } else if (url.indexOf('pepperfry.com') >= 0) {
            return 'pepperfry';
        }
        return null;
    },
    getSellerJobModelInstance: function(seller) {
        var jobSellerModelName = seller + '_job';
        return mongoose.model(jobSellerModelName);
    }
};
