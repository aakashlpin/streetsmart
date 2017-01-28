'use strict';
var winston = require('winston');
var _ = require('underscore');
var config = require('./config/config');
var Papertrail = require('winston-papertrail').Papertrail;
require('winston-daily-rotate-file');

var winstonPapertrail = new Papertrail({
  host: 'logs5.papertrailapp.com',
  port: 52312,
  colorize: true,
})

winstonPapertrail.on('error', function(err) {
    // Handle, report, or silently ignore connection errors and failures
});

var transport = new winston.transports.DailyRotateFile({
  filename: './logs/log',
  datePattern: '.yyyy-MM-ddTHH',
  handleExceptions: true
})

exports.logger = new (winston.Logger)({
  transports: [
    transport,
    winstonPapertrail,
  ]
});
