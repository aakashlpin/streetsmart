const _ = require('underscore');
const processUrl = require('./processUrl');
const createJob = require('./createJob');
const logger = require('../../logger').logger;

function processUserJob(job, done) {
  const { id, data } = job;
  const { seller, productURL } = data;

  logger.log('info', 'adding job to user jobs', { id }, data);

  processUrl({ seller, productURL }, (err, processedData) => {
    if (err) {
      // inform the queue that the job failed
      // let queue level events handle that
      logger.log('error', 'unable to process url for user job', { id }, data, err);
      return done(err.error);
    }

    logger.log('info', 'processUrl for ', { seller, productURL }, processedData);

    createJob(_.extend({}, data, processedData), (err, response) => {
      if (err) {
        // processing succedded but creating job failed. duh.
        logger.log('error', 'url processed but unable to create job', { id }, data, err);
        return done(err);
      }

      return done(null, response);
    });
  });
}

module.exports = processUserJob;
