const _ = require('underscore');
const processUrl = require('./processUrl');
const processNotifications = require('./processNotifications');
const dbConnections = require('./dbConnections');
const sellerUtils = require('../utils/seller');
const logger = require('../../logger').logger;

const { jobModelConnections, priceHistoryConnections } = dbConnections;

function processJob(jobData, done) {
  const { id, data } = jobData;
  const {
    _id,
    productURL,
    seller,
    email,
    targetPrice,
    alertToPrice,
    currentPrice: storedPrice,
  } = data;

  // TODO
  /**
  back off early if
  1. data available in data Store
  2. ...
  **/
  processUrl({ productURL, seller }, (err, processedData) => {
    if (err) {
      /*
      there could be plenty of reasons for this -
      1. network failure
      2. proxy limit exhausted
      3. endpoint unavailable - 404
      4. data not available in parseable format
      5. ...you get the idea
      */
      logger.log('Job Errored', { id, err });
      if (err.statusCode === 404) {
        jobModelConnections[seller]
        .update({ _id }, { $set: { suspended: true } }, {}, updateErr =>
          done(updateErr)
        );
        return;
      }
      return done(err.error);
    }

    const { productPrice: scrapedPrice } = processedData;
    logger.log(`Job scraped successfully for ${seller} ${productURL} `);
    /**
    TODO
    1. update datastore
    2. update database
    3. schedule notifications, if required
    **/

    let updateWith = {
      currentPrice: scrapedPrice,
      failedAttempts: 0,
    };

    const deservesNotifications =
      processNotifications.deservesNotifications({
        storedPrice,
        scrapedPrice,
        targetPrice,
        alertToPrice,
      });


    if (deservesNotifications) {
      logger.log('Job deserves notifications', { id, storedPrice, scrapedPrice });
      updateWith = _.extend({}, updateWith, {
        alertToPrice: scrapedPrice,
        alertFromPrice: storedPrice,
      });
    }

    jobModelConnections[seller].update({ _id }, updateWith, {}, (errDbUpdate) => {
      if (errDbUpdate) {
        // TODO
        // this can happen either due to db connection issues - which are rare
        // or due to this job being removed while this job was enqueued for processing
      }
    });

    priceHistoryConnections[seller].create({
      jobId: _id,
      price: scrapedPrice,
      email,
      productURL,
      date: new Date(),
    }, (errDbInsert) => {
      if (errDbInsert) {
        logger.log('insertion in db failed', errDbInsert);
      }
    });

    if (deservesNotifications) {
      const notificationData = _.extend({}, data, {
        storedPrice,
        currentPrice: scrapedPrice,
        measure: storedPrice > scrapedPrice ? 'dropped' : 'increased',
        trackURL: `${process.env.server}/track/${seller}/${_id}`,
      });

      processNotifications.sendNotifications({ email }, notificationData);

      // update the emails counter
      sellerUtils.increaseCounter('emailsSent');
    }

    return done();
  });
}

module.exports = processJob;
