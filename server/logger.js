'use strict';
var winston = require('winston');
var _ = require('underscore');
var config = require('./config/config');
require('winston-daily-rotate-file');

var transport = new winston.transports.DailyRotateFile({
  filename: './logs/log',
  datePattern: '.yyyy-MM-ddTHH',
  handleExceptions: true
})

exports.logger = new (winston.Logger)({
  transports: [
    transport
  ]
});
