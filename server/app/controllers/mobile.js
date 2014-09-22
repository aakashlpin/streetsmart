'use strict';
var Emails = require('./emails');
var _ = require('underscore');
_.str = require('underscore.string');
var mongoose = require('mongoose');
var User = mongoose.model('User');
var Job = mongoose.model('Job');
var config = require('../../config/config');
var logger = require('../../logger').logger;

module.exports = {
	initiateDeviceRegistration: function(req, res) {
		var registrationData = _.pick(req.body, ['email']);

		if (!registrationData.email) {
			res.json({status: 'error', message: 'Please enter an email id'});
			return;
		}

		User.findOne({email: registrationData.email}).lean().exec(function(err, userDoc) {
			if (err || !userDoc) {
				res.json({status: 'error', message: 'Sorry! This email id does not exist in our system!'});
				return;
			}

			//TODO generate a 6 digit number and store it in the db corresponding to the email id

			// User.update({email: registrationData.email}, {})

			Emails.sendDeviceVerificationCode(registrationData, function() {
				res.json({status: 'ok'});
			});
		});
	},
	verifyDeviceRegistration: function(req, res) {
		res.json({status: 'ok'});
	},
	finalizeDeviceRegistration: function(req, res) {
		res.json({status: 'ok'});
	}
};