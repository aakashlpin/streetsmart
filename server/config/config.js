'use strict';

var path = require('path'),
rootPath = path.normalize(__dirname + '/..'),
env = process.env.NODE_ENV || 'development';

var config = {
    development: {
        root: rootPath,
        app: {
            name: 'streetsmart'
        },
        port: 6000,
        kuePort: 6001,
        server: 'http://localhost:6000',
        db: 'mongodb://localhost/streetsmart-development',
        flipkartAffiliateKey: 'affid',
        flipkartAffiliateId: 'aakashlpi',
        cronPattern: '0-59/2 * * * *'    //every 5 minutes
    },

    test: {
        root: rootPath,
        app: {
            name: 'streetsmart'
        },
        port: 6000,
        kuePort: 6001,
        server: 'localhost:6000',
        db: 'mongodb://localhost/streetsmart-test',
        flipkartAffiliateKey: 'affid',
        flipkartAffiliateId: 'aakashlpi',
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
        flipkartAffiliateKey: 'affid',
        flipkartAffiliateId: 'aakashlpi',
        cronPattern: '0-59/15 * * * *'    //every 15 minutes
    }
};

module.exports = config[env];
