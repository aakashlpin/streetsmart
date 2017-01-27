'use strict';
var winston = require('winston');
var loggly = require('loggly');
var _ = require('underscore');
var config = require('./config/config');
require('winston-daily-rotate-file');

var transport = new winston.transports.DailyRotateFile({
  filename: './logs/log',
  datePattern: '.yyyy-MM-ddTHH',
  handleExceptions: true
})

new (winston.Logger)({
  transports: [
    transport
  ]
});

var client = loggly.createClient({
    token: '62dfdf72-ecb5-409e-98f8-4c4b164b4714',
    subdomain: 'cheapass',
    json: true
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
        //additionaly it can receive tags. send dev or prod mode as one
        client.log(logObject, [process.env.NODE_ENV || 'development']);
        winston.log.apply(winston, arguments);

    },
    profile: function() {
        winston.profile.apply(winston, arguments);

    },
    getHourlyLogs: function(callback) {
        var options = {
            from: new Date - 60 * 60 * 1000,
            until: new Date,
            limit: 100,
            start: 0,
            order: 'desc',
            fields: ['message']
        };

        //
        // Find items logged between today and yesterday.
        //
        winston.query(options, function (err, results) {
            if (err) {
                return callback(err);
            }

            var logs = results.dailyRotateFile;

            //do a frequency count of config.sellerCronWorkerLog
            var sellerCronLogs = _.filter(logs, function(log) {
                return log.message === config.sellerCronWorkerLog;
            });

            var jobCompletedLogs = _.filter(logs, function(log) {
                return log.message === config.jobRemovedLog;
            });

            callback(null, {
                sellerCronLogs: sellerCronLogs,
                jobCompletedLogs: jobCompletedLogs
            });
        });
    }
};
