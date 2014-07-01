'use strict';

var path = require('path'),
rootPath = path.normalize(__dirname + '/..'),
env = process.env.NODE_ENV || 'development',
_ = require('underscore');

var sellerConfig = {
    flipkart: {
        key: 'affid',
        value: 'aakashlpi'
    },
    amazon: {
        key: 'tag',
        value: 'cheapass0a-21'
    },
    myntra: {
        key: null,
        value: null
    },
    jabong: {
        key: null,
        value: null
    },
    bajaao: {
        key: null,
        value: null
    },
    fabfurnish: {
        key: null,
        value: null
    },
    infibeam: {
        key: 'trackId',
        value: 'aaka'
    },
    pepperfry: {
        key: null,
        value: null
    },
    snapdeal: {
        key: null,
        value: null
    }
};

var config = {
    development: {
        root: rootPath,
        app: {
            name: 'streetsmart'
        },
        port: 6000,
        kuePort: 6001,
        server: 'http://cheapass.in',
        db: 'mongodb://localhost/streetsmart-development',
        cronPattern: '0-59/5 * * * *'    //every 5 minutes
    },

    production: {
        root: rootPath,
        app: {
            name: 'streetsmart'
        },
        port: 6000,
        kuePort: 6001,
        server: 'http://cheapass.in',
        db: 'mongodb://localhost/streetsmart-production',
        cronPattern: '0-59/15 * * * *'    //every 15 minutes
    }
};

_.extend(config.development, sellerConfig);
_.extend(config.production, sellerConfig);

module.exports = config[env];
