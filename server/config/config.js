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
        server: 'http://cheapass.in',
        db: 'mongodb://localhost/streetsmart-development',
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
        cronPattern: '0-59/15 * * * *'    //every 15 minutes
    }
};

module.exports = config[env];
