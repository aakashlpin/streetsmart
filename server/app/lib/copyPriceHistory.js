const _ = require('underscore');
const mongoose = require('mongoose');
const sellerUtils = require('../utils/seller');

const logger = require('../../logger').logger;

function copyPriceHistory({ seller, id, toJobId, email, done = () => {} }) {
  sellerUtils
  .getSellerProductPriceHistoryModelInstance(seller)
  .find({ jobId: id }, { _id: 0, email: 0 })
  .lean()
  .exec((err, priceHistoryDocs) => {
    if (err) {
      logger.log('error', 'error getting product price history', err);
      return done(err);
    }

    sellerUtils
    .getSellerProductPriceHistoryModelInstance(seller)
    .bulkInsert(
      priceHistoryDocs.map(
        priceHistoryDoc => _.extend({}, priceHistoryDoc, {
          jobId: mongoose.Types.ObjectId(toJobId),
          email,
        })
      ),
      (err, docs) => {
        if (err) {
          logger.log('error', 'error doing insertMany', err);
          return done(err);
        }

        if (!docs) {
          logger.log('error', 'no docs inserted');
        }

        return done();
      }
    );
  });
}

module.exports = copyPriceHistory;
