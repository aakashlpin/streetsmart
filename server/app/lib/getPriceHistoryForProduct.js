const _ = require('underscore');
_.str = require('underscore.string');

const mongoose = require('mongoose');

const sellerUtils = require('../utils/seller');
const logger = require('../../logger').logger;

const server = process.env.SERVER;

module.exports = ({ seller, id, queryParams = {} }, callback = () => {}) => {
  sellerUtils
  .getSellerProductPriceHistoryModelInstance(seller)
  .find({ jobId: id }, { price: 1, date: 1 })
  .sort({ date: 1 })
  .lean()
  .exec((err, priceHistoryDocs) => {
    if (err) {
      logger.log('error', 'error getting price history docs for %s', id);
      return callback(500);
    }

    if (queryParams.app) {
      return callback(null, priceHistoryDocs);
    }

    sellerUtils
      .getSellerJobModelInstance(seller)
      .findById(id, { productPriceHistory: 0 }, (err, doc) => {
        if (err || !doc) {
          return callback(500);
        }

        const { productName, productURL, currentPrice, productImage } = doc;

        sellerUtils
        .getSellerProductPriceHistoryModelInstance(seller)
        .aggregate([
          { $match: { jobId: mongoose.Types.ObjectId(id) } },
          { $group: {
            _id: { jobId: '$jobId' },
            min: { $min: '$price' },
          } },
        ])
        .exec((err, aggregatedResults) => {
          const resultForItem = aggregatedResults[0];
          let leastPriceTracked;

          if (!resultForItem || !resultForItem.min) {
            leastPriceTracked = null;
          } else {
            leastPriceTracked = resultForItem.min;
          }

          const tmplData = {
            productName,
            productURL,
            currentPrice,
            leastPriceTracked,
            lowestPriceOn: currentPrice < leastPriceTracked ? 'currentPrice' : 'leastPriceTracked',
            productImage,
            productPriceHistory: priceHistoryDocs,
            productSeller: _.str.capitalize(seller),
            baseUrl: server,
          };

          callback(null, tmplData);
        });
      });
  });
};
