const mongoose = require('mongoose');
const Emails = require('./emails');
const _ = require('underscore');
_.str = require('underscore.string');
const async = require('async');
const request = require('request');
const moment = require('moment');

const server = process.env.SERVER;
const JobModel = mongoose.model('Job');
const UserModel = mongoose.model('User');

module.exports = {
  index(req, res) {
    res.render('adminIndex.html');
  },
  dashboard(req, res) {
    res.render('adminDashboard.html');
  },
  getUsers(req, res) {
    JobModel.find().lean().exec((err, jobs) => {
      if (err) {
        res.json({ error: err });
        return;
      }
      // find all unique email ids
      const users = [];

      _.each(jobs, (job) => {
        if (!_.find(users, user => user.email === job.email)) {
          users.push({
            email: job.email,
            isActive: job.isActive,
            isReminded: !!job.isReminded,
          });
        }
      });

      async.each(users, (user, asyncEachCb) => {
        let currentTracks = 0;
        let lifetimeTracks;

        UserModel
        .findOne({ email: user.email })
        .exec((err, userFromDb) => {
          if (err) {
            throw err;
          }
          if (userFromDb) {
            user.since = moment(userFromDb._id.getTimestamp()).format('DD/MMM/YYYY');
          } else {
            user.since = '-';
          }

          request.get({
            url: (`${server}/api/dashboard/tracks/${user.email}`),
            json: true,
          }, (err, response, tracksArray) => {
            if (err) {
              return asyncEachCb(err);
            }

            tracksArray = tracksArray || [];

            _.each(tracksArray, (sellerTracks) => {
              if (sellerTracks && sellerTracks.tracks) {
                currentTracks += sellerTracks.tracks.length;
              }
            });

            lifetimeTracks = _.filter(jobs, userJob => userJob.email === user.email);

            user.currentTracks = currentTracks;
            user.lifetimeTracks = lifetimeTracks.length;
            user.fullContact = userFromDb ? userFromDb.fullContact : {};
            asyncEachCb();
          });
        });
      }, (err) => {
        if (err) {
          return res.json({ error: err });
        }
        res.json(users);
      });
    });
  },
  reminderEmail(req, res) {
    const emailObj = _.pick(req.query, ['email']);
    if (!emailObj.email) {
      return res.json({ error: 'Error! Expected an email' });
    }

    Emails.sendReminderEmail(emailObj, (err) => {
      if (err) {
        return res.json({ err });
      }
      const userUpdate = emailObj;
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
