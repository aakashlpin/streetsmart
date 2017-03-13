
const _ = require('underscore');
_.str = require('underscore.string');
const config = require('../../config/config');
const sellerUtils = require('../utils/seller');
const async = require('async');
const moment = require('moment');
const logger = require('../../logger').logger;
const Deal = require('../lib/deals').Deal;
const mongoose = require('mongoose');
const UserLookup = require('./userLookup');
const Emails = require('../controllers/emails');
const request = require('request');
const kue = require('kue');

const UserModel = mongoose.model('User');
const initialBatchSize = 50;
const futureBatchSize = 20;
let currentDeal;

let processedData = [];
let totalPages = 0;

function refreshDeal(callback) {
  callback = callback || function () {};

  let deal = new Deal('amazon', 'banner');
  deal.getDeal((err, dealObj) => {
    if (!err) {
      currentDeal = dealObj;
      callback(null, currentDeal);
      deal = null;
    } else {
      callback(err, null);
      deal = null;
    }
  });
}

module.exports = {
  getFullContactByEmail() {
    UserModel.find((err, users) => {
      if (err) {
        return logger.log('error', 'error getting all users to get full contact', err);
      }
      async.eachSeries(users, (user, asyncSeriesCb) => {
        setTimeout(() => {
          if (
            (user.fullContact && _.keys(user.fullContact).length) ||
            (user.fullContactAttempts && user.fullContactAttempts >= 3)
          ) {
            return asyncSeriesCb();
          }
          UserLookup.get(user.email, (err, userData) => {
            let updateWith;
            if (userData !== null) {
              updateWith = {
                fullContact: userData,
              };
            } else {
              user.fullContactAttempts = user.fullContactAttempts || 0;
              updateWith = {
                fullContactAttempts: user.fullContactAttempts + 1,
              };
            }
            UserModel.update({ email: user.email }, updateWith, {}, () => asyncSeriesCb());
          });
        }, process.env.FULL_CONTACT_RATE_LIMIT * 1000);
      });
    }, (err) => {
      if (err) {
        logger.log('error', 'error in getFullContactByEmail', err);
      } else {
        logger.log('info', 'finished doing getFullContactByEmail');
      }
    });
  },
  processAllProducts() {
    logger.log('processing all products for home page', { at: moment().format('MMMM Do YYYY, h:mm:ss a') });

    async.mapSeries(Object.keys(config.sellers), (seller, sellerAsyncCb) => {
      const sellerModel =
        sellerUtils.getSellerJobModelInstance(seller);

      const sellerModelProductPriceHistory =
        sellerUtils.getSellerProductPriceHistoryModelInstance(seller);

      sellerModel
      .find(
        { suspended: { $ne: true }, productImage: { $exists: true, $nin: ['', 'undefined', 'null'] } },
        { productURL: 1, productImage: 1, productName: 1, currentPrice: 1 }
      )
      .lean()
      .exec((err, results) => {
        if (err) {
          logger.log({
            message: 'in exec sellerModel',
            sellerModel: sellerModel.modelName,
            error: err,
          });
        }

        logger.log({ seller, resultsLength: results.length });

        sellerModelProductPriceHistory
        .aggregate([
          { $match: { jobId: { $in: results.map(result => result._id) } } },
          { $group: {
            _id: { jobId: '$jobId' },
            min: { $min: '$price' },
          } },
        ])
        .exec((err, aggregatedResults) => {
          if (err) {
            logger.log({
              err,
              sellerModelProductPriceHistory: sellerModelProductPriceHistory.modelName,
            });

            return sellerAsyncCb(err);
          }

          const idToMinPriceMap =
            aggregatedResults
            .filter(item => item.min)
            .reduce((obj, item) => {
              obj[item._id.jobId] = item.min;
              return obj;
            }, {});

          const resultsMappedWithMinPrice =
            results
            .map(result => _.extend({}, result, {
              seller,
              ltp: idToMinPriceMap[result._id],
            }))
            .filter(result => result.ltp);

          sellerAsyncCb(null, resultsMappedWithMinPrice);
        });
      });
    }, (err, sellerResultsWithMinPrice) => {
      processedData = _.shuffle(_.flatten(sellerResultsWithMinPrice, true));
      if (processedData.length < initialBatchSize) {
        totalPages = 1;
      } else {
        totalPages = Math.ceil((processedData.length - initialBatchSize) / futureBatchSize);
      }

      logger.log({ totalPages });

      logger.log('completed processing all products for home page', { at: moment().format('MMMM Do YYYY, h:mm:ss a') });
    });
  },
  getPagedProducts(page) {
    page = Number(page);
    if (page <= 0) {
      return [];
    }
    if (page === 1) {
      // initial page request
      return _.first(processedData, initialBatchSize);
    }
    const beginIndex = initialBatchSize + ((page - 2) * futureBatchSize) - 1;
    const endIndex = beginIndex + futureBatchSize;
    return processedData.slice(beginIndex, endIndex);
  },
  getProcessedProducts() {
    return processedData;
  },
  getTotalPages() {
    return totalPages;
  },
  getCurrentDeal(callback) {
    if (currentDeal) {
      callback(null, currentDeal);
    } else {
      refreshDeal(callback);
    }
  },
  createAndSendDailyReport() {
		// fake some numbers right now.
    Emails.sendDailyReport(_.random(900, 1200), () => {});
  },
  generateAmazonSalesReport(callback) {
    callback = callback || function () {};

    const requestOptions = {
      url: 'http://flipkart.cheapass.in/generate-report',
      method: 'POST',
      form: {
        API_KEY: 'fuck_you_flipkart',
      },
    };

    request(requestOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        try {
          if (typeof body !== 'object') {
            body = JSON.parse(body);
          }
        } catch (e) {}

        body.month = `http://flipkart.cheapass.in${body.month}`;
        body.yesterday = `http://flipkart.cheapass.in${body.yesterday}`;

        Emails.sendAmazonSalesReport(body, () => {});
        callback(null);
      } else {
        callback('some error');
      }
    });
  },
  removeFailedJobs: () => {
    kue.Job.rangeByState('failed', 0, 100, 'asc', (err, jobs) => {
      jobs.forEach((job) => {
        job.remove(() => {
          logger.log('failed job removed in background', job.id);
        });
      });
    });
  },
  generateReviewEmailForAlertsTask(callback) {
    logger.log('info', '[generateReviewEmailForAlertsTask] beginning');
    callback = callback || function () {};
    const date = moment().subtract(3, 'months').toDate();
    const userAlerts = {};

    console.time('generateReviewEmailForAlertsTask');

    UserModel.find({}, { email: 1 }).lean().exec((err, users) => {
      async.eachSeries(users, (user, asyncOneCb) => {
        const email = user.email;
        async.eachLimit(_.keys(config.sellers), 2, (seller, asyncTwoCb) => {
          const SellerModel = sellerUtils.getSellerJobModelInstance(seller);
          SellerModel.find(
            {
              email,
              createdAt: {
                $lte: date,
              },
              suspended: {
                $ne: true,
              },
            },
            {
              productURL: 1,
              productName: 1,
              productImage: 1,
              createdAt: 1,
            }
          )
          .lean()
          .exec((err, userAlertsOnSeller) => {
            if (!err && userAlertsOnSeller && userAlertsOnSeller.length) {
              if (!userAlerts[email]) {
                userAlerts[email] = [];
              }

              userAlerts[email] = userAlerts[email].concat(
                userAlertsOnSeller.map(userAlertOnSeller => Object.assign(
                  userAlertOnSeller, {
                    seller,
                    sellerName: config.sellers[seller].name,
                    createdAtFormatted: moment(userAlertOnSeller.createdAt).format('Do MMM YYYY'),
                  }
                ))
              );

              const ids = userAlertsOnSeller.map(alert => alert._id);

              SellerModel.update(
                { _id: { $in: ids } },
                { $set: { suspended: true } },
                { multi: true },
                (err, results) => {
                  logger.log('info', `[generateReviewEmailForAlertsTask] suspended ${results.n} alerts for ${email} on ${seller}`);
                  asyncTwoCb(err);
                }
              );

              return;
            }

            asyncTwoCb(err);
          });
        }, (err) => {
          asyncOneCb(err);
        });
      }, (err) => {
        console.timeEnd('generateReviewEmailForAlertsTask');
        callback(err, userAlerts);

        Emails.sendAlertsSuspensionNotifier(userAlerts, (err) => {
          if (err) {
            logger.log('error in Emails.sendAlertsSuspensionNotifier', err);
          }
        });
      });
    });
  },
  sendSuspensionEmail(callback) {
    const userAlerts = {};
    UserModel.find({}, { email: 1 }).lean().exec((err, users) => {
      async.eachSeries(users, (user, asyncOneCb) => {
        const email = user.email;
        async.eachLimit(_.keys(config.sellers), 2, (seller, asyncTwoCb) => {
          const SellerModel = sellerUtils.getSellerJobModelInstance(seller);
          SellerModel.find(
            {
              email,
              suspended: true,
            },
            {
              productURL: 1,
              productName: 1,
              productImage: 1,
              createdAt: 1,
            }
          )
          .lean()
          .exec((err, userAlertsOnSeller) => {
            if (!err && userAlertsOnSeller && userAlertsOnSeller.length) {
              if (!userAlerts[email]) {
                userAlerts[email] = [];
              }

              userAlerts[email] = userAlerts[email].concat(
                userAlertsOnSeller.map(userAlertOnSeller => Object.assign(
                  userAlertOnSeller, {
                    seller,
                    sellerName: config.sellers[seller].name,
                    createdAtFormatted: moment(userAlertOnSeller.createdAt).format('Do MMM YYYY'),
                  }
                ))
              );
            }

            asyncTwoCb(err);
          });
        }, (err) => {
          asyncOneCb(err);
        });
      }, (err) => {
        callback(err, userAlerts);

        Emails.sendAlertsSuspensionNotifier(userAlerts, (err) => {
          if (err) {
            logger.log('error in Emails.sendAlertsSuspensionNotifier', err);
          }
        });
      });
    });
  },
  refreshDeal,
};
