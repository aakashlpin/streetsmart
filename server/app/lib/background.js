
const _ = require('underscore');
_.str = require('underscore.string');
const config = require('../../config/config');
const sellerUtils = require('../utils/seller');
const async = require('async');
const moment = require('moment');
const logger = require('../../logger').logger;
const mongoose = require('mongoose');
const UserLookup = require('./userLookup');
const Emails = require('../controllers/emails');
const request = require('request');
const kue = require('kue');
const redis = require('redis');

const redisClient = redis.createClient();
const UserModel = mongoose.model('User');
const initialBatchSize = 50;
const futureBatchSize = 20;

let processedData = [];
let totalPages = 0;
let isProcessing = false;
let isProcessingUsers = false;

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
    if (isProcessing) {
      return;
    }

    isProcessing = true;

    console.time('processing all products for home page');

    processedData = [];

    const q = async.queue((doc, callback) => {
      const { seller, item } = doc;

      const sellerModelProductPriceHistory =
        sellerUtils.getSellerProductPriceHistoryModelInstance(seller);

      sellerModelProductPriceHistory
      .aggregate([
        { $match: { jobId: item._id } },
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

          return callback(err);
        }

        const resultForItem = aggregatedResults[0];

        if (!resultForItem || !resultForItem.min) {
          return callback();
        }

        processedData.push(
          _.extend({}, item, {
            seller,
            ltp: resultForItem.min,
          })
        );

        callback(null);
      });
    });

    q.drain = () => {
      processedData = _.shuffle(processedData);
      if (processedData.length < initialBatchSize) {
        totalPages = 1;
      } else {
        totalPages = Math.ceil((processedData.length - initialBatchSize) / futureBatchSize);
      }

      logger.log(console.timeEnd('processing all products for home page'));

      logger.log('completed processing all products for home page', { totalPages });

      isProcessing = false;
    };

    const sellerQueue = async.queue((doc, callback) => {
      const { seller } = doc;
      const sellerModel = sellerUtils.getSellerJobModelInstance(seller);

      sellerModel
      .find(
        { suspended: { $ne: true }, failedAttempts: { $lt: 5 }, productImage: { $exists: true, $nin: ['', 'undefined', 'null'] } },
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
          return callback(err);
        }
        results.forEach(result => q.push({ seller, item: result }));
        return callback(null);
      });
    });

    sellerQueue.drain = () => {
      // all sellers have been processed
      logger.log('all seller items have been sent for processing');
    };

    Object.keys(config.sellers).forEach((seller) => {
      sellerQueue.push({ seller });
    });
  },
  getPagedProducts(page) {
    const pageNumber = Number(page);
    if (pageNumber <= 0) {
      return [];
    }
    if (pageNumber === 1) {
      // initial pageNumber request
      return _.first(processedData, initialBatchSize);
    }
    const beginIndex = (initialBatchSize + ((pageNumber - 2) * futureBatchSize)) - 1;
    const endIndex = beginIndex + futureBatchSize;
    return processedData.slice(beginIndex, endIndex);
  },
  getProcessedProducts() {
    return processedData;
  },
  getTotalPages() {
    return totalPages;
  },
  generateAmazonSalesReport(callback) {
    const requestOptions = {
      url: 'http://flipkart.cheapass.in/generate-report',
      method: 'POST',
      form: {
        API_KEY: 'fuck_you_flipkart',
      },
    };

    request(requestOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        let parsedBody = body;
        try {
          if (typeof body !== 'object') {
            parsedBody = JSON.parse(body);
          }
        } catch (e) {
          logger.log('error', 'unable to JSON.parse body', body);
        }

        parsedBody.month = `http://flipkart.cheapass.in${parsedBody.month}`;
        parsedBody.yesterday = `http://flipkart.cheapass.in${parsedBody.yesterday}`;

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
  processAllUsers(cb = () => {}) {
    if (isProcessingUsers) {
      return logger.log('not processing all users because it\'s already in progress');
    }

    isProcessingUsers = true;

    logger.log('processing all users');

    redisClient.hget('timestamps', 'emailAlertsSet', (err, reply) => {
      if (!err && reply) {
        if (moment().diff(moment(Number(reply)), 'hours') < 1) {
          return;
        }
      }

      console.time('processAllUsers');

      const sellers = Object.keys(config.sellers);
      const map = {};

      const userQueue = async.queue((doc, callback) => {
        const { email, _id } = doc;

        const sellerQueue = async.queue((sellerDoc, sellerCallback) => {
          const { seller } = sellerDoc;

          sellerUtils
          .getSellerJobModelInstance(seller)
          .find({ email, suspended: { $ne: true } })
          .lean()
          .exec((err, results) => {
            if (err) {
              return sellerCallback(err);
            }

            if (!map[email]) {
              map[email] = {
                signup: _id.getTimestamp(),
                total: 0,
                sellers: {},
              };
            }

            map[email].sellers[seller] = results ? results.length : 0;
            map[email].total += map[email].sellers[seller];

            sellerCallback(null);
          });
        });

        sellers.forEach((seller) => {
          sellerQueue.push({ seller });
        });

        sellerQueue.drain = () => {
          redisClient.zadd('emailAlertsSet', map[email].total, email);
          callback();
        };
      });

      UserModel
      .find({}, { email: 1, _id: 1 })
      .lean()
      .exec((err, docs) => {
        docs.forEach((doc) => {
          userQueue.push(doc);
        });
      });

      userQueue.drain = () => {
        logger.log('completed processing all users', console.timeEnd('processAllUsers'));

        redisClient.hset('timestamps', 'emailAlertsSet', +new Date());
        isProcessingUsers = false;

        cb(null, map);
      };
    });
  },
};
