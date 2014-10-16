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

var processedData = [];
var totalPages = 0;

function getLeastPriceFromHistory (history) {
	if (!history.length) {
		return null;
	}

	return _.sortBy(history, 'price')[0];
}

module.exports = {
	processAllProducts: function () {
		logger.log('info', 'processing all products for home page', {at: moment().format('MMMM Do YYYY, h:mm:ss a')});
		var allTracks = [];
		var hotCache = {};
		async.each(_.keys(config.sellers), function (seller, asyncEachCb) {
			sellerUtils
			.getSellerJobModelInstance(seller)
			.find({}, {email: 0, isActive: 0})
			.lean()
			.exec(function(err, sellerJobs) {
				_.each(sellerJobs, function (sellerJob) {
					var dataInCache = hotCache[sellerJob.productURL] || false;
					var leastPriceForJob;
					if (dataInCache) {
						dataInCache.eyes += 1;
						//compare with the productPriceHistory of this simiar track
						//if lesser price is found, update the entry
						leastPriceForJob = getLeastPriceFromHistory(sellerJob.productPriceHistory);
						if (leastPriceForJob && (leastPriceForJob.price < dataInCache.ltp)) {
							dataInCache.ltp = leastPriceForJob.price;
						}

					} else {
						sellerJob.eyes = 1;
						sellerJob.seller = seller;
						leastPriceForJob = getLeastPriceFromHistory(sellerJob.productPriceHistory);
						sellerJob.ltp = leastPriceForJob ? leastPriceForJob.price : sellerJob.currentPrice;
						delete sellerJob.productPriceHistory;
						hotCache[sellerJob.productURL] = sellerJob;
					}
				});

				allTracks.push(_.values(hotCache));
				hotCache = {};
				asyncEachCb(err);
			});
		}, function () {
			processedData = _.sortBy(_.flatten(allTracks, true), 'eyes').reverse();
			//1st page = initialBatchSize
			//next page onwards = futureBatchSize
			if (processedData.length < initialBatchSize) {
				totalPages = 1;
			} else {
				totalPages = 1 + (processedData.length - initialBatchSize)/futureBatchSize;
				if (totalPages !== parseInt(totalPages)) {
					totalPages += 1;
				}
			}
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
	}
};