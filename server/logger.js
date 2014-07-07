'use strict';
var winston = require('winston');
var loggly = require('loggly');
var _ = require('underscore');

winston.add(winston.transports.DailyRotateFile, {
    filename: './logs/log',
    datePattern: '.yyyy-MM-ddTHH',
    handleExceptions: true
});

var client = loggly.createClient({
    token: '85955fea-ec95-440e-9e33-67e994fb2437',
    subdomain: 'cheapass',
    tags: ['NodeJS'],
    json:true
});

exports.logger = {
    log: function() {
        var args = Array.prototype.slice.call(arguments, 0);
        var logLevel = args[0];
        var logMessage = args[1];
        var logMeta = args[2];

        var logObject = {
            level: logLevel,
            message: logMessage,
            meta: {}
        };

        if (logMeta) {
            if (_.isObject(logMeta)) {
                _.extend(logObject.meta, logMeta);

            } else {
                logObject.meta = logMeta;
            }
        }

        //loggly requires a single nested object unlike winston
        client.log(logObject);
        winston.log.apply(winston, arguments);
    },
    profile: function() {
        winston.profile.apply(winston, arguments);
    }
};
