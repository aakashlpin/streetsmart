const mongoose = require('mongoose');
const redis = require('redis');
const async = require('async');
const moment = require('moment');
const _ = require('underscore');
const Emails = require('./emails');
const logger = require('../../logger').logger;

const redisClient = redis.createClient();
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
  getAdminUsers(req, res) {
    const { draw, start, length } = req.query;
    const nDraw = Number(draw);
    const nStart = Number(start);
    const nLength = Number(length);

    redisClient.zcount('emailAlertsSet', 3, '+inf', (err, count) => {
      if (err) {
        logger.log('err', 'error getting redisClient.zcount(emailAlertsSet)', err);
        return res.status(500).json({
          error: err,
        });
      }

      redisClient.zrevrangebyscore('emailAlertsSet', '+inf', 3, 'WITHSCORES', 'LIMIT', nStart, nLength, (err, reply) => {
        if (err) {
          return res.status(500).json({
            error: err,
          });
        }

        if (!reply || (reply && !reply.length)) {
          return res.status(500).json({
            error: 'nothing found in redis for specified query',
          });
        }

        const emails = reply.filter((item, index) => index % 2 === 0);
        const emailToAlertsCount = {};
        for (let i = 0; i < reply.length; i += 2) {
          emailToAlertsCount[reply[i]] = Number(reply[i + 1]);
        }

        const userData = [];

        const q = async.queue((doc, callback) => {
          const { email } = doc;

          UserModel.findOne(
            { email },
            { _id: 1, email: 1, fullContact: 1 }
          )
          .lean()
          .exec((err, userDoc) => {
            if (err) {
              return callback(err);
            }

            userData.push(
              _.extend({}, userDoc, {
                activeAlerts: emailToAlertsCount[email],
                signedUpAt: moment(userDoc._id.getTimestamp()).format('YYYY MMM Do, h:m a'),
              })
            );

            return callback();
          });
        });

        q.drain = () => {
          res.json({
            draw: nDraw,
            recordsTotal: count,
            recordsFiltered: count,
            data: userData,
          });
        };

        emails.forEach(email => q.push({ email }));
      });
    });
  },
};
