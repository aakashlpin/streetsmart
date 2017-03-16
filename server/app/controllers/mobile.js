
require('es6-promise').polyfill();
require('isomorphic-fetch');
const Emails = require('./emails');
const sendNotifications = require('../lib/processNotifications');
const _ = require('underscore');
const mongoose = require('mongoose');
const logger = require('../../logger').logger;
_.str = require('underscore.string');

const User = mongoose.model('User');

module.exports = {
  initiateDeviceRegistration(req, res) {
    const payload = req.body.email ? req.body : req.query;
    const registrationData = _.pick(payload, ['email']);

    if (!registrationData.email) {
      res.json({ status: 'error', message: 'Please enter an email id' });
      return;
    }

    // generate a 6 digit number and store it in the db corresponding to the email id
    const verificationCode = Math.floor((Math.random() * 999999) + 1);

    User.update(
      { email: registrationData.email },
      { $push: { verificationCodes: verificationCode } },
      { upsert: true }, () => {
        registrationData.verificationCode = verificationCode;
        Emails.sendDeviceVerificationCode(registrationData, () => {
          res.json({ status: 'ok' });
        });
      }
    );
  },
  verifyDeviceRegistration(req, res) {
    const payload = req.body.email ? req.body : req.query;
    const registrationData = _.pick(payload, ['email', 'verify_code']);

    if (!registrationData.email) {
      res.json({ status: 'error', message: 'Please enter an email id' });
      return;
    }

    if (!registrationData.verify_code) {
      res.json({ status: 'error', message: 'Please enter the verification code' });
      return;
    }

    User.findOne({ email: registrationData.email }).lean().exec((err, userDoc) => {
      const verificationCodes = userDoc.verificationCodes;
      const isValidVerificationCode = !!(_.find(verificationCodes, verificationCode =>
        verificationCode === registrationData.verify_code)
      );

      if (isValidVerificationCode) {
        res.json({ status: true });
      } else {
        res.json({ status: false });
      }
    });
  },
  finalizeDeviceRegistration(req, res) {
    const registrationData = _.pick(req.body, ['email', 'token']);

    if (!registrationData.email) {
      res.json({ status: 'error', message: 'Please send an email id' });
      return;
    }

    if (!registrationData.token) {
      res.json({ status: 'error', message: 'Please send the device id' });
      return;
    }

    User.update(
      { email: registrationData.email },
      { androidDeviceToken: registrationData.token },
      {},
      (err, updatedDoc) => {
        if (err || !updatedDoc) {
          res.json({ status: 'error', message: err });
          return;
        }
        res.json({ status: 'ok' });
      });
  },
  simulateNotification(req, res) {
    const payload = _.pick(req.query, ['email']);
    if (payload.email === 'aakash.lpin@gmail.com') {
      const emailUser = {
        email: payload.email,
      };

      const emailProduct = {
        productPrice: 69999,
        productName: 'Apple iPhone 6 Plus',
        productURL: 'http://www.flipkart.com/apple-iphone-5s/p/itmdv6f75dyxhmt4?pid=MOBDPPZZDX8WSPAT',
        currentPrice: 69999,
        oldPrice: 80000,
        seller: 'Flipkart',
        measure: 'dropped',
      };

      sendNotifications(emailUser, emailProduct);
      res.json({ status: 'ok' });
    } else {
      res.json({ status: 'error', message: 'email id not a developer' });
    }
  },
  simulateIOSNotification(req, res) {
    const emailProduct = {
      productName: 'Fitbit Charge Wireless Activity Tracker and Sleep Wristband, Large (Black)',
      productURL: 'http://www.flipkart.com/apple-iphone-5s/p/itmdv6f75dyxhmt4?pid=MOBDPPZZDX8WSPAT',
      currentPrice: 7990,
      oldPrice: 9990,
      seller: 'amazon',
      measure: 'dropped',
    };

    sendNotifications({ email: 'aakash.lpin@gmail.com' }, emailProduct);
    res.json({ status: 'ok' });
  },
  storeIOSDeviceToken(req, res) {
    const props = _.pick(req.body, ['email', 'parsePayload']);
    if (!props.email || !props.parsePayload) {
      return res.json({ status: 'error', message: 'Invalid Request. Expected email and parsePayload' });
    }

    logger.log('info', 'installation data is ', props.email, props.parsePayload);

    let url = 'https://api.parse.com';
    url += '/1/installations';
    fetch(url, {
      method: 'post',
      headers: {
        Accept: 'application/json',
        'X-Parse-Application-Id': process.env.PARSE_APP_ID,
        'X-Parse-REST-API-Key': process.env.PARSE_REST_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(props.parsePayload),
    })
    .then(response => response.json())
    .then((response) => {
      logger.log('info', 'response from Parse to POST request to create a new installation', response);
      let resourceURI;
      if (response.Location) {
        resourceURI = response.Location;
      } else {
        resourceURI = `https://api.parse.com/1/installations/${response.objectId}`;
      }
      return fetch(resourceURI, {
        method: 'put',
        headers: {
          Accept: 'application/json',
          'X-Parse-Application-Id': process.env.PARSE_APP_ID,
          'X-Parse-REST-API-Key': process.env.PARSE_REST_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: props.email,
        }),
      });
    })
    .then(response => response.json())
    .then((response) => {
      logger.log('info', 'response from parse PUT request to attach email to Installation', response);
      User.update(
        { email: props.email },
        { $push: { iOSDeviceTokens: props.parsePayload.deviceToken } },
        {},
        (err, updatedDoc) => {
          if (err || !updatedDoc) {
            res.json({ status: 'error', message: 'Internal Server Error', error: err });
            return;
          }
          res.json({ status: 'ok' });
        });
    })
    .catch((e) => {
      res.json({ status: 'error', message: 'Internal Server Error in Catch', error: e });
    });
  },
};
