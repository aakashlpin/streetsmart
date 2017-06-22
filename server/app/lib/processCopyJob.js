const mongoose = require('mongoose');
const createJob = require('./createJob');
const copyPriceHistory = require('./copyPriceHistory');
const logger = require('../../logger').logger;
const sellerUtils = require('../utils/seller');

const UserModel = mongoose.model('User');

function processCopyJob(job, done) {
  const { id: jobId, data } = job;
  const { data: { seller, id, email } } = data;

  logger.log('info', 'adding job to user jobs', { jobId, seller, id, email });

  sellerUtils
  .getSellerJobModelInstance(seller)
  .findById(id, { _id: 0, productPriceHistory: 0 })
  .lean()
  .exec((err, doc) => {
    if (err) {
      logger.log('error', 'error finding seller job by id', err, id);
      return done(err);
    }

    if (!doc) {
      logger.log('error', 'no doc found by id for id', id);
      return done('no doc exists');
    }

    logger.log('info', 'doc found by id', doc);

    createJob({
      email,
      currentPrice: doc.currentPrice,
      productName: doc.productName,
      productURL: doc.productURL,
      productImage: doc.productImage,
      seller,
      source: 'blog',
      copySourceId: id,
    }, (err, createJobRes) => {
      if (err) {
        // processing succeded but creating job failed. duh.
        logger.log('error', 'product id found but unable to create job', { id }, data, err);
        return done(err);
      }

      // if the user if not verified,
      // don't flood the DB with price history records
      // instead do it when user verifies the email id
      UserModel.findOne(
        { email },
        { _id: 1, email: 1, suspended: 1 }
      )
      .lean()
      .exec((err, user) => {
        if (err) {
          logger.log('error', 'error trying to find user by email', { email });
          return done(err);
        }

        if (!user || (user && user.suspended)) {
          // user hasn't verified email id yet.
          // we'll copy the price history upon verification
          return done();
        }

        copyPriceHistory({
          seller,
          id,
          toJobId: createJobRes.createdJobId,
          email,
          done,
        });
      });
    });
  });
}

module.exports = processCopyJob;
