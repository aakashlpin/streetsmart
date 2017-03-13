const mongoose = require('mongoose');
const _ = require('underscore');
const Emails = require('../controllers/emails');
const config = require('../../config/config');
const TwitterFeed = require('./twitterFeed');
const logger = require('../../logger').logger;
// const gcm = require('node-gcm');

const UserModel = mongoose.model('User');

function deservesNotifications({
  storedPrice, scrapedPrice, targetPrice, alertToPrice,
}) {
  // if price is same, no alert
  if (storedPrice === scrapedPrice) {
    return false;
  }
  // if price is higher, no alert
  if (storedPrice < scrapedPrice) {
    return false;
  }
  // consider target price if it's set for this item
  if (targetPrice) {
    if (scrapedPrice <= targetPrice) {
      logger.log('Alert will be sent because user set target price met');
      return true;
    }
    logger.log('Skipping alert because target price set and not met');
    return false;
  }

  // if price is lower, maybe
  const priceRange = storedPrice;
  let minDiff = 0;
  let isMinDiffFulfilled = false;

  if (priceRange <= 100) {
    minDiff = 10;
  } else if (priceRange > 100 && priceRange <= 500) {
    minDiff = 25;
  } else if (priceRange > 500 && priceRange <= 1000) {
    minDiff = 50;
  } else if (priceRange > 1000 && priceRange <= 2500) {
    minDiff = 75;
  } else if (priceRange > 2500 && priceRange <= 10000) {
    minDiff = 100;
  } else if (priceRange > 10000) {
    minDiff = 250;
  }

  isMinDiffFulfilled = (storedPrice - scrapedPrice >= minDiff);

  if (!isMinDiffFulfilled) {
    logger.log('Skipping alert because min diff not met', { diff: storedPrice - scrapedPrice, minDiff });
    return false;
  }

  // wow. you really want the alert. Ok. Last check!

  // if the alert about to be sent is same as the last one, no alert
  if (alertToPrice === scrapedPrice) {
    logger.log('Skipping alert because it\'d be a duplicate');
    return false;
  }

  // ok. you win. now buy, please?
  return true;
}

function sendNotifications({ email }, emailProduct) {
  if (process.env.IS_DEV && process.env.ADMIN_EMAIL_IDS.indexOf(email) === -1) {
    logger.log(`Not sending alerts in dev mode to ${email}`);
    return;
  }

  UserModel.findOne({ email }).lean().exec((err, userDoc) => {
    if (err) {
      return logger.log('error', `CRITICAL: wanted to send notifications but unable to UserModel.findOne ${email}`);
    }
    const { _id } = userDoc;
    const notificationUser = {
      _id,
      email,
    };

    // send notification email for price change
    Emails.sendNotifier(notificationUser, emailProduct, (sendNotifierErr, message) => {
      if (sendNotifierErr) {
        logger.log('error', 'Unable to send price drop email', { sendNotifierErr });
      } else {
        logger.log('Successfully sent price drop email', { message });
      }
    });

    TwitterFeed.postStatus(emailProduct);

    if (userDoc.androidDeviceToken) {
      const androidNotificationMessage = `${emailProduct.productName} is now available at ₹${emailProduct.currentPrice}/- on ${config.sellers[emailProduct.seller].name}`;
      fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: process.env.GCM_AUTHORIZATION_KEY,
        },
        body: JSON.stringify({
          content_available: true,
          notification: {
            sound: 'default',
            title: 'Cheapass Price Drop Alert!',
            body: androidNotificationMessage,
            click_action: 'fcm.ACTION.PRICE_DROP_ALERT',
            icon: 'ic_stat_notification',
            color: '#0B315B',
          },
          data: emailProduct,
          to: userDoc.androidDeviceToken,
        }),
      })
      .then(response => response.json())
      .then((response) => {
        logger.log('info', 'push notification response from Firebase', response);
      })
      .catch((e) => {
        logger.log('error sending push notification ', e);
      });
    }

    if (userDoc.iOSDeviceTokens && userDoc.iOSDeviceTokens.length) {
      const iosNotificationMessage = `${emailProduct.productName} is now available at ₹${emailProduct.currentPrice}/- on ${config.sellers[emailProduct.seller].name}`;

      const url = 'https://api.parse.com/1/push';
      fetch(url, {
        method: 'post',
        headers: {
          Accept: 'application/json',
          'X-Parse-Application-Id': process.env.PARSE_APP_ID,
          'X-Parse-REST-API-Key': process.env.PARSE_REST_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          where: {
            email: notificationUser.email,
          },
          data: _.extend({}, {
            alert: iosNotificationMessage,
          }, emailProduct),
        }),
      })
      .then(response => response.json())
      .then((response) => {
        logger.log('push notification response from parse', response);
      })
      .catch((e) => {
        logger.log('error sending push notification ', e);
      });
    }
  });
}

module.exports = {
  deservesNotifications,
  sendNotifications,
};
