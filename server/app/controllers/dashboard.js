const Emails = require('./emails');
const _ = require('underscore');
_.str = require('underscore.string');
const mongoose = require('mongoose');
const config = require('../../config/config');
const logger = require('../../logger').logger;
const sellerUtils = require('../utils/seller');
const async = require('async');

const User = mongoose.model('User');
const Job = mongoose.model('Job');

module.exports = {
  getTracks(req, res) {
    const userEmail = decodeURIComponent(req.params.userEmail);
    const sellers = _.keys(config.sellers);
    const responseData = [];
    async.each(sellers, (seller, asyncCb) => {
      const SellerJobModel = sellerUtils.getSellerJobModelInstance(seller);
      const responseObject = {
        seller,
        tracks: [],
      };
      SellerJobModel
      .find({ email: userEmail }, { productPriceHistory: 0 })
      .lean()
      .exec((err, items) => {
        if (err) {
          asyncCb(err);
        } else {
          responseObject.tracks = items;
          responseData.push(responseObject);
          asyncCb();
        }
      });
    }, (err) => {
      if (err) {
        res.json({ err });
        return;
      }
      res.json(responseData);
    });
  },
  sendDashboardLink(req, res) {
    const rawEmail = req.query.email;
    if (!rawEmail || typeof rawEmail === 'undefined') {
      res.json({ error: 'Please provide an email id' });
      return;
    }

    const email = decodeURIComponent(req.query.email);
    User.get({ query: { email } }, (err, user) => {
      if (err) {
        res.json({ error: err });
        return;
      }
      Emails.sendWelcome(user, (err, done) => {
        if (err) {
          logger.log('error', 'error in sending dashboard link email', err);
          res.json({ error: err });
        } else if (done) {
          res.json({ status: 'ok' });
        }
      });
    });
  },
  getUsers(req, res) {
    Job.find().lean().exec((err, jobs) => {
      if (err) {
        res.json({ error: err });
        return;
      }
            // find all unique email ids
      const uniqueEmails = [];
      _.each(jobs, (job) => {
        if (!_.find(uniqueEmails, emailObj => emailObj.email === job.email)) {
          uniqueEmails.push({
            email: job.email,
            isActive: job.isActive,
          });
        }
      });
      res.json(uniqueEmails);
    });
  },
  setPreferences(req, res) {
    const email = req.params.userEmail;
    const dropOnlyAlerts = req.query.dropOnlyAlerts;

    User.update({ email }, { dropOnlyAlerts }, {}, (err, updatedDoc) => {
      if (err || !updatedDoc) {
        res.json({ error: err });
      } else {
        res.json({ status: 'ok' });
      }
    });
  },
  setTargetPrice(req, res) {
    const seller = req.query.seller;
    const _id = req.query._id;
    const targetPrice = req.query.targetPrice;

    if (!targetPrice) {
      return res.json({ error: 'Expected targetPrice' });
    }

    const SellerJobModel = sellerUtils.getSellerJobModelInstance(seller);

    if (Number(targetPrice) === -1) {
      SellerJobModel.update({ _id }, { $unset: { targetPrice: 1 } }, (err, updatedDoc) => {
        if (err || !updatedDoc) {
          res.json({ error: err });
        } else {
          res.json({ status: 'ok' });
        }
      });
      return;
    }

    SellerJobModel.update({ _id }, { targetPrice }, (err, updatedDoc) => {
      if (err || !updatedDoc) {
        res.json({ error: err });
      } else {
        res.json({ status: 'ok' });
      }
    });
  },
};
