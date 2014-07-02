'use strict';

var path = require('path'),
rootPath = path.normalize(__dirname + '/..'),
env = process.env.NODE_ENV || 'development',
_ = require('underscore');

var commonConfig = {
    root: rootPath,
    app: {
        name: 'streetsmart'
    },
    port: 6000,
    kuePort: 6001,
    server: 'http://cheapass.in',
    postmarkAPIKey: '72f0644f-1c98-492e-b8f7-a7cff8b1b908',
    sellers: [
        flipkart: {
            key: 'affid',
            value: 'aakashlpi',
            cronPattern: '0-59/30 * * * *'    //30 mins
        },
        amazon: {
            key: 'tag',
            value: 'cheapass0a-21',
            cronPattern: '* 0-23/1 * * *'   //1 hour
        },
        myntra: {
            key: null,
            value: null,
            cronPattern: '0 0-23/3 * * *'
        },
        jabong: {
            key: null,
            value: null,
            cronPattern: '15 0-23/3 * * *'
        },
        fabfurnish: {
            key: null,
            value: null
            cronPattern: '30 0-23/3 * * *'
        },
        infibeam: {
            key: 'trackId',
            value: 'aaka'
            cronPattern: '45 0-23/3 * * *'
        },
        bajaao: {
            key: null,
            value: null
            cronPattern: '0 1-23/3 * * *'
        },
        pepperfry: {
            key: null,
            value: null
            cronPattern: '15 1-23/3 * * *'
        },
        snapdeal: {
            key: null,
            value: null
            cronPattern: '30 1-23/3 * * *'
        }
    ]
};

var config = {
    development: {
        db: 'mongodb://localhost/streetsmart-development',
        isCronActive: true  //use this to control running of cron jobs
    },

    production: {
        db: 'mongodb://localhost/streetsmart-production',
        isCronActive: true
    }
};

_.extend(config.development, commonConfig);
_.extend(config.production, commonConfig);

module.exports = config[env];
