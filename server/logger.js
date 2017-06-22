const winston = require('winston');
const Papertrail = require('winston-papertrail').Papertrail;
require('winston-daily-rotate-file');

const papertrail = new Papertrail({
  host: 'logs5.papertrailapp.com',
  port: 52312,
  colorize: true,
});

const fileTransport = new winston.transports.DailyRotateFile({
  filename: './logs/log',
  datePattern: '.yyyy-MM-ddTHH',
  handleExceptions: true,
});

let transports;
if (process.env.IS_DEV) {
  transports = [
    new (winston.transports.Console)(),
    fileTransport,
  ];
} else {
  transports = [
    new (winston.transports.Console)(),
    fileTransport,
    papertrail,
  ];
}

const logger = new (winston.Logger)({
  transports,
});

papertrail.on('error', (err) => {
  if (err) {
    logger.error('papertrail error', err);
  }
});

exports.logger = {
  log: (level, ...args) => {
    if (['error', 'warn', 'info', 'verbose', 'debug', 'silly'].indexOf(level) !== -1) {
      return logger[level].call(logger, ...args);
    }
    return logger.info.call(logger, level, ...args);
  }
};
