'use strict';
var mongoose = require('mongoose');
var JobModel = mongoose.model('Job');
var UserModel = mongoose.model('User');
var Emails = require('./emails');
var _ = require('underscore');
_.str = require('underscore.string');
var async = require('async');
var request = require('request');
var config = require('../../config/config');
var moment = require('moment');
var env = process.env.NODE_ENV || 'development';
var server = config.server[env];

module.exports = {
	index: function (req, res) {
		res.render('adminIndex.html');
	},
	dashboard: function (req, res) {
		res.render('adminDashboard.html');
	},
	getUsers: function(req, res) {
		JobModel.find().lean().exec(function(err, jobs) {
			if (err) {
				res.json({error: err});
				return;
			}
			//find all unique email ids
			var users = [];

			_.each(jobs, function(job) {
			    if (!_.find(users, function(user) { return user.email === job.email; })) {
			        users.push({
			            email: job.email,
			            isActive: job.isActive,
			            isReminded: job.isReminded ? true: false
			        });
			    }
			});

			async.each(users, function(user, asyncEachCb) {
				var currentTracks = 0;
				var lifetimeTracks;

				UserModel
				.findOne({email: user.email})
				.exec(function(err, userFromDb) {
					if (err) {
						throw err;
					}
					if (userFromDb) {
						user.since = moment(userFromDb._id.getTimestamp()).format('DD/MMM/YYYY');
					} else {
						user.since = '-';
					}

					request.get({
						url: (server + '/api/dashboard/tracks/' + user.email),
						json: true
					}, function(err, response, tracksArray) {
						if (err) {
							return asyncEachCb(err);
						}

						tracksArray = tracksArray || [];

						_.each(tracksArray, function(sellerTracks) {
							if (sellerTracks && sellerTracks.tracks) {
								currentTracks += sellerTracks.tracks.length;
							}
						});

						lifetimeTracks = _.filter(jobs, function(userJob) {
							return userJob.email === user.email;
						});

						user.currentTracks = currentTracks;
						user.lifetimeTracks = lifetimeTracks.length;
						user.fullContact = userFromDb ? userFromDb.fullContact : {};
						asyncEachCb();
					});
				});

			}, function (err) {
				if (err) {
					return res.json({error: err});
				}
				res.json(users);
			});
		});
	},
	reminderEmail: function (req, res) {
		var emailObj = _.pick(req.query, ['email']);
		if (!emailObj.email) {
			return res.json({error: 'Error! Expected an email'});
		}

		Emails.sendReminderEmail(emailObj, function(err) {
			if (err) {
				return res.json({err: err});
			}
			var userUpdate = emailObj;
			var updateWith = { isReminded: true };
			var updateOptions = { multi: true };
			JobModel.update(userUpdate, updateWith, updateOptions, function (err, updatedDocs) {
				if (err) {
					return res.json({error: err});
				}
				return res.json({status: 'ok', updatedDocs: updatedDocs});
			});
		});
	}
};