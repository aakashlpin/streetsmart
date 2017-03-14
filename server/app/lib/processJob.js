const _ = require('underscore');
const processUrl = require('./processUrl');
const processNotifications = require('./processNotifications');
const dbConnections = require('./dbConnections');
const sellerUtils = require('../utils/seller');
const logger = require('../../logger').logger;
// const Store = require('./store').Store;

// const urlDataStore = new Store();

const { jobModelConnections, priceHistoryConnections } = dbConnections;

function updateStorageAndSendNotifications(data) {
  const { currentPrice: storedPrice, productPrice: scrapedPrice } = data;
  const { targetPrice, alertToPrice } = data;
  const { _id, id, seller, email, productURL } = data;
  /**
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
      // this can happen either due to db connection issues - which are rare
      // or due to this job being removed while this job was enqueued for processing
      logger.log('error', `in updating db jobModelConnections for ${seller}`, errDbUpdate);
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
}

function processJob(jobData, done) {
  const { id, data } = jobData;
  const {
    _id,
    productURL,
    seller,
  } = data;

  /**
  back off early if
  1. data available in data Store
  2. ...
  **/

  // urlDataStore.get(productURL, (err, urlData) => {
  //   if (!err && urlData) {
  //     return updateStorageAndSendNotifications(_.extend({ id }, urlData, data));
  //   }

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

    logger.log(`Job scraped successfully for ${seller} ${productURL} `);

    // urlDataStore.set(productURL, processedData);

    updateStorageAndSendNotifications(_.extend({ id }, processedData, data));

    return done();
  });
  // });
}

module.exports = processJob;
