'use strict';
require('es6-promise').polyfill();
require('isomorphic-fetch');
var Emails = require('./emails');
var jobUtils = require('../lib/jobs');
var _ = require('underscore');
_.str = require('underscore.string');
var mongoose = require('mongoose');
var User = mongoose.model('User');
// var Job = mongoose.model('Job');
var config = require('../../config/config');
var logger = require('../../logger').logger;

module.exports = {
	initiateDeviceRegistration: function(req, res) {
		var payload = req.body.email ? req.body : req.query;
		var registrationData = _.pick(payload, ['email']);

		if (!registrationData.email) {
			res.json({status: 'error', message: 'Please enter an email id'});
			return;
		}

		User.findOne({email: registrationData.email}).lean().exec(function(err, userDoc) {
			if (err || !userDoc) {
				res.json({status: 'error', message: 'Sorry! This email id does not exist in our system!'});
				return;
			}

			//generate a 6 digit number and store it in the db corresponding to the email id
			var verificationCode = Math.floor(Math.random()*999999+1);

			User.update({email: registrationData.email}, {$push: {verificationCodes: verificationCode}}, {}, function() {
				registrationData.verificationCode = verificationCode;
				Emails.sendDeviceVerificationCode(registrationData, function() {
					res.json({status: 'ok'});
				});
			});
		});
	},
	verifyDeviceRegistration: function(req, res) {
		var payload = req.body.email ? req.body : req.query;
		var registrationData = _.pick(payload, ['email', 'verify_code']);

		if (!registrationData.email) {
			res.json({status: 'error', message: 'Please enter an email id'});
			return;
		}

		if (!registrationData.verify_code) {
			res.json({status: 'error', message: 'Please enter the verification code'});
			return;
		}

		User.findOne({email: registrationData.email}).lean().exec(function(err, userDoc) {
			var verificationCodes = userDoc.verificationCodes;
			var isValidVerificationCode = !!(_.find(verificationCodes, function(verificationCode) {
				return verificationCode === registrationData.verify_code;
			}));

			if (isValidVerificationCode) {
				res.json({status: true});
			} else {
				res.json({status: false});
			}
		});

	},
	finalizeDeviceRegistration: function(req, res) {
		var payload = req.body.email ? req.body : req.query;
		var registrationData = _.pick(payload, ['email', 'deviceid']);

		if (!registrationData.email) {
			res.json({status: 'error', message: 'Please send an email id'});
			return;
		}

		if (!registrationData.deviceid) {
			res.json({status: 'error', message: 'Please send the device id'});
			return;
		}

		User.update({email: registrationData.email}, {$push: {deviceIds: registrationData.deviceid}}, {}, function(err, updatedDoc) {
			if (err || !updatedDoc) {
				res.json({status: 'error', message: 'Internal Server Error'});
				return;
			}
			res.json({status: 'ok'});
		});

	},
	simulateNotification: function(req, res) {
		var payload = _.pick(req.query, ['email']);
		if (payload.email === 'aakash.lpin@gmail.com') {
			var emailUser = {
				email: payload.email
			};

			var emailProduct = {
				productPrice: 69999,
				productName: 'Apple iPhone 6 Plus',
				productURL: 'http://www.flipkart.com/apple-iphone-5s/p/itmdv6f75dyxhmt4?pid=MOBDPPZZDX8WSPAT',
				currentPrice: 69999,
				oldPrice: 80000,
				seller: 'Flipkart',
				measure: 'dropped'
			};

			jobUtils.sendNotifications(emailUser, emailProduct);
			res.json({status: 'ok'});

		} else {
			res.json({status: 'error', message: 'email id not a developer'});
		}
	},
	storeIOSDeviceToken: function (req, res) {
		logger.log('info', 'req.query', req.query);
		logger.log('info', 'req.body', req.body);
		var props = _.pick(JSON.parse(req.body), ['email', 'parsePayload']);
		if (!props.email || !props.parsePayload) {
			return res.json({status: 'error', message: 'Invalid Request. Expected email and parsePayload'});
		}

		var url = 'https://api.parse.com';
		url += '/1/installations';
		fetch(url, {
				method: 'post',
				headers: {
						'Accept': 'application/json',
						'X-Parse-Application-Id': config.PARSE.APP_ID,
						'X-Parse-REST-API-Key': config.PARSE.REST_KEY,
						'Content-Type': 'application/json'
				},
				body: JSON.stringify(props.parsePayload)
		})
		.then(function (response) {
			return response.json();
		})
		.then(function (json) {
			User.update({email: props.email}, {$push: {iOSDeviceTokens: props.deviceToken}}, {}, function(err, updatedDoc) {
				if (err || !updatedDoc) {
					res.json({status: 'error', message: 'Internal Server Error'});
					return;
				}
				res.json({status: 'ok'});
			});
		})
		.catch(function (e) {
			res.json({status: 'error', message: 'Internal Server Error'});
		});
	}
};
