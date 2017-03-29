const _ = require('underscore');
const mongoose = require('mongoose');
const logger = require('../../logger').logger;
const Emails = require('../controllers/emails');
const sellerUtils = require('../utils/seller');
const redis = require('redis');
const dbConnections = require('./dbConnections');

const { jobModelConnections, priceHistoryConnections } = dbConnections;
const UserModel = mongoose.model('User');
const redisClient = redis.createClient();

// data =>
// {
//     email: String,
//     currentPrice: Number,
//     productName: String,
//     productURL: String,
//     productImage: String,
//     seller: String,
//     source: String
// }

function createJob(data, callback) {
  _.extend(data, {
    currentPrice: data.currentPrice || data.productPrice,
  });

  const {
    email,
    currentPrice,
    productImage,
    productName,
    productURL,
    seller,
    source,
  } = data;

  UserModel.findOne({ email }, { _id: 1, email: 1, suspended: 1 }, (err, user) => {
    if (err) {
      logger.log('error', 'error finding email in user model', {
        error: err,
        email,
      });

      return callback(err);
    }

    const jobData = {
      email,
      currentPrice,
      productName,
      productURL,
      productImage,
      seller,
      source,
      suspended: !user,
      createdAt: new Date(),
    };

    const SellerJobModel = jobModelConnections[seller];
    const SellerPriceHistoryModel = priceHistoryConnections[seller];
    SellerJobModel.collection.update({ email, productURL }, jobData, { upsert: true },
      (err, reply) => {
        if (err) {
          logger.log('error', 'unable to upsert', jobData, err);
          return callback(err);
        }

        if (reply.result.nModified) {
          // however, the entry gets updated with createdAt timestamp
          logger.log('job already exists', jobData);
        }

        if (reply.result.upserted && reply.result.upserted.length) {
          const { _id } = reply.result.upserted[0];
          logger.log('job upserted', jobData);
          SellerPriceHistoryModel.collection.insert({
            jobId: _id,
            email,
            productURL,
            date: new Date(),
            price: currentPrice,
          });

          sellerUtils.increaseCounter('itemsTracked');
          redisClient.zincrby('emailAlertsSet', 1, email);
        }
      }
    );

    if (!user) {
      // new user flow
      logger.log('new user unverified', { email, jobData });
      UserModel.collection.insert({ email, suspended: true }, (err, doc) => {
        if (err) {
          logger.log('error', 'unable to insert to user collection', err);
          return callback(err);
        }

        const _id = doc.ops[0]._id;

        Emails.sendVerifier({ email, _id }, data, (err, status) => {
          if (err) {
            return logger.log('error', 'error sending verification email', {
              error: err,
              email,
            });
          }
          logger.log('info', 'verification email triggered', { status, email });
        });
      });
      return callback(null, {
        status: 'ok',
      });
    }

    if (user && user.suspended) {
      logger.log('newish user unverified and inactive', { email, jobData });

      Emails.sendVerifier({ email, _id: user._id }, data, (err, status) => {
        if (err) {
          return logger.log('error', 'error sending verification email', {
            error: err,
            email,
          });
        }
        logger.log('info', 'verification email triggered', { status, email });
      });

      return;
    }

    // existing user flow
    logger.log('returning user', { email, jobData });
    Emails.sendHandshake({ email, _id: user._id }, data, (err, status) => {
      if (err) {
        logger.log('error', 'error sending acceptance email', { error: err, email });
        return;
      }
      logger.log('info', 'acceptance email triggered', { status, email });
    });

    return callback(null, {
      status: 'ok',
    });
  });
}

module.exports = createJob;
