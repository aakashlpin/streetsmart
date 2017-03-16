const _ = require('underscore');
const mongoose = require('mongoose');
const logger = require('../../logger').logger;
const Emails = require('../controllers/emails');
const sellerUtils = require('../utils/seller');

const User = mongoose.model('User');
const Job = mongoose.model('Job');

function createJob(data, callback) {
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

  _.extend(data, {
    currentPrice: data.currentPrice || data.productPrice,
  });

  User.findOne({ email: data.email }, (err, userQueryResult) => {
    if (err) {
      logger.log('error', 'error finding email in user model', { error: err, email: data.email });
      return;
    }

    const isEmailVerified = userQueryResult ? (!!userQueryResult.email) : false;
    const emailObject = { email: data.email };
    let responseMessage = '';
    let responseCode;

    if (!isEmailVerified) {
      logger.log('info', 'new user unverified', { email: data.email });
      responseMessage = 'Please verify your email id to activate this alert.';
      responseCode = 'pending';

      Emails.sendVerifier(emailObject, data, (err, status) => {
        if (err) {
          logger.log('error', 'error sending verification email', { error: err, email: emailObject.email });
          return;
        }
        logger.log('info', 'verification email triggered', { status, email: emailObject.email });
      });
    } else {
      logger.log('info', 'returning user', { email: userQueryResult.email });
      responseMessage = 'Awesome! Price drop alert activated.';
      responseCode = 'verified';
    }

    const jobData = {
      email: emailObject.email,
      currentPrice: data.currentPrice,
      productName: data.productName,
      productURL: data.productURL,
      productImage: data.productImage,
      seller: data.seller,
      source: data.source,
      isEmailVerified,    // this is needed for some checks while creating a new job
    };

    Job.post({ query: jobData }, (err, createdJob) => {
      if (err || !createdJob) {
        logger.log('error', 'error adding job to db', { error: err });
        return callback(null, {
          status: err,
          code: 'error',
        });
      }

      // increase the products counter in the db
      sellerUtils.increaseCounter('itemsTracked');
      callback(null, {
        status: responseMessage,
        code: responseCode,
      });

      if (isEmailVerified) {
        emailObject._id = userQueryResult._id;
        Emails.sendHandshake(emailObject, data, (err, status) => {
          if (err) {
            logger.log('error', 'error sending acceptance email', { error: err, email: emailObject.email });
            return;
          }
          logger.log('info', 'acceptance email triggered', { status, email: emailObject.email });
        });
      }
    });
  });
}

module.exports = createJob;
