var winston = require('winston');
winston.add(winston.transports.DailyRotateFile, {
    filename: './logs/log',
    datePattern: '.yyyy-MM-ddTHH',
    handleExceptions: true
});

exports.logger = winston;
