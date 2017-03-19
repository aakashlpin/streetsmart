const mongoose = require('mongoose');
const Emails = require('./emails');
const async = require('async');
const config = require('../../config/config');
const sellerUtils = require('../utils/seller');

const JobModel = mongoose.model('Job');
const UserModel = mongoose.model('User');

module.exports = {
  index(req, res) {
    res.render('adminIndex.html');
  },
  dashboard(req, res) {
    res.render('adminDashboard.html', {
      baseUrl: process.env.SERVER,
    });
  },
  processAllUsers(req, res) {
    const sellers = Object.keys(config.sellers);
    const map = {};
    const countToEmailMap = {};

    console.time('processAllUsers');

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
        console.log({
          email,
        });

        const countForEmail = map[email].total;

        if (!countToEmailMap[countForEmail]) {
          countToEmailMap[countForEmail] = 1;
        } else {
          countToEmailMap[countForEmail] += 1;
        }

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
      // console.log(map);
      console.log(countToEmailMap);
      const numberOfUsersTrackingMoreThan3Items =
        Object.keys(countToEmailMap).reduce((counter, count) => {
          if (Number(count) >= 1) {
            return countToEmailMap[count] + counter;
          }
          return counter;
        }, 0);
      console.log({ numberOfUsersTrackingMoreThan3Items });
      console.timeEnd('processAllUsers');
      res.json(map);
    };
  },
  reminderEmail(req, res) {
    const { email } = req.query;
    if (!email) {
      return res.json({ error: 'Error! Expected an email' });
    }

    Emails.sendReminderEmail({ email }, (err) => {
      if (err) {
        return res.json({ err });
      }
      const userUpdate = { email };
      const updateWith = { isReminded: true };
      const updateOptions = { multi: true };
      JobModel.update(userUpdate, updateWith, updateOptions, (err, updatedDocs) => {
        if (err) {
          return res.json({ error: err });
        }
        return res.json({ status: 'ok', updatedDocs });
      });
    });
  },
};
