'use strict';
var _ = require('underscore');
_.str = require('underscore.string');
var config = require('../../config/config');
var sellerUtils = require('../utils/seller');
var async = require('async');
var moment = require('moment');
var logger = require('../../logger').logger;
var initialBatchSize = 50;
var futureBatchSize = 20;
var Deal = require('../lib/deals').Deal;
var mongoose = require('mongoose');
var UserModel = mongoose.model('User');
var UserLookup = require('./userLookup');
var Emails = require('../controllers/emails');
var currentDeal;

var processedData = [];
var totalPages = 0;

function refreshDeal (callback) {
	callback = callback || function() {};

	var deal = new Deal('amazon', 'banner');
	deal.getDeal(function (err, dealObj) {
		if (!err) {
			currentDeal = dealObj;
			callback(null, currentDeal);
			deal = null;

		} else {
			callback(err, null);
			deal = null;
		}
	});
}

module.exports = {
	getFullContactByEmail: function () {
		UserModel.find(function (err, users) {
			if (err) {
				return logger.log('error', 'error getting all users to get full contact', err);
			}
			async.eachSeries(users, function (user, asyncSeriesCb) {
				setTimeout(function () {
					if (
						(user.fullContact && _.keys(user.fullContact).length) ||
						(user.fullContactAttempts && user.fullContactAttempts >= 3)
					) {
						return asyncSeriesCb();
					}
					UserLookup.get(user.email, function (err, userData) {
						var updateWith;
						if (userData !== null) {
							updateWith = {
								fullContact: userData
							};
						} else {
							user.fullContactAttempts = user.fullContactAttempts || 0;
							updateWith = {
								fullContactAttempts: user.fullContactAttempts + 1
							};
						}
						UserModel.update({email: user.email}, updateWith, {}, function () {
							return asyncSeriesCb();
						});
					});
				}, config.fullContactRateLimit * 1000);
			});
		}, function (err) {
			if (err) {
				logger.log('error', 'error in getFullContactByEmail', err);
			} else {
				logger.log('info', 'finished doing getFullContactByEmail');
			}
		});
	},
	processAllProducts: function () {
		logger.log('info', 'processing all products for home page', {at: moment().format('MMMM Do YYYY, h:mm:ss a')});
		var allTracks = [];
		async.each(_.keys(config.sellers), function (seller, sellerAsyncCb) {
			var sellerModel = sellerUtils.getSellerJobModelInstance(seller);
			var sellerModelProductPriceHistory = sellerUtils.getSellerProductPriceHistoryModelInstance(seller);

			sellerModelProductPriceHistory
			.aggregate(
				[
					{
						$group:
							{
								_id: { productURL: '$productURL' },
								min: { $min: '$price' }
							}
					}
				], function (err, aggregatedResults) {
					async.each(aggregatedResults, function (aggregatedResult, aggregatedResultAsynCb) {
						sellerModel
						.findOne(
							{
								productURL: aggregatedResult._id.productURL
							},
							{
								productURL 		: 1,
								productName		: 1,
								productImage 	: 1,
								currentPrice 	: 1
							}
						)
						.lean()
						.exec(function (err, storedJob) {
							if (err) {
								return aggregatedResultAsynCb(err);
							}

							if (storedJob) {
								_.extend(storedJob, {
									ltp 			: aggregatedResult.min,
									seller 			: seller
								});

								allTracks.push(storedJob);
							}

							aggregatedResultAsynCb();

						});

					}, function (err) {
						if (err) {
							return sellerAsyncCb(err);
						}

						sellerAsyncCb();
					});
				}
			);
		}, function () {
			// processedData = _.sortBy(_.flatten(allTracks, true), 'eyes').reverse();
			processedData = _.shuffle(_.flatten(allTracks, true));
			//1st page = initialBatchSize
			//next page onwards = futureBatchSize

			//make them available for GC
			allTracks = null;

			if (processedData.length < initialBatchSize) {
				totalPages = 1;
			} else {
				totalPages = 1 + (processedData.length - initialBatchSize)/futureBatchSize;
				if (totalPages !== parseInt(totalPages)) {
					totalPages += 1;
				}
			}

			logger.log('info', 'completed processing all products for home page', {at: moment().format('MMMM Do YYYY, h:mm:ss a')});
		});
	},
	getPagedProducts: function (page) {
		page = parseInt(page);
		if (page <= 0) {
			return [];

		}
		if (page === 1) {
			//initial page request
			return _.first(processedData, initialBatchSize);

		} else {
			var beginIndex = initialBatchSize + ((page - 2) * futureBatchSize) - 1;
			var endIndex = beginIndex + futureBatchSize;
			return processedData.slice(beginIndex, endIndex);
		}
	},
	getProcessedProducts: function () {
		return processedData;
	},
	getTotalPages: function () {
		return totalPages;
	},
	getCurrentDeal: function (callback) {
		if (currentDeal) {
			callback(null, currentDeal);
		} else {
			refreshDeal(callback);
		}
	},
	createAndSendDailyReport: function () {
		// fake some numbers right now.
		Emails.sendDailyReport(_.random(900, 1200), function () {});
	},
	refreshDeal: refreshDeal
};
