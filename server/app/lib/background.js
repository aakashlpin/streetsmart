'use strict';
var _ = require('underscore');
_.str = require('underscore.string');
var config = require('../../config/config');
var sellerUtils = require('../utils/seller');
var async = require('async');
var moment = require('moment');
var logger = require('../../logger').logger;
var cp = require('child_process');
var Deal = require('../lib/deals').Deal;
var currentDeal;

var processedData = [];
var pagedProcessedData = {};
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
	processAllProducts: function () {
		logger.log('info', 'processing all products for home page', {at: moment().format('MMMM Do YYYY, h:mm:ss a')});

		var allTracks = [];

		async.each(_.keys(config.sellers), function (seller, asyncEachCb) {
			sellerUtils
			.getSellerJobModelInstance(seller)
			.find({}, {email: 0, isActive: 0})
			.lean()
			.exec(function(err, sellerJobs) {
				var child = cp.fork(__dirname + '/worker-process-products');

				child.on('message', function (processedSellerProducts) {
					allTracks.push(processedSellerProducts);
					asyncEachCb(err);
				});

				child.send({
					seller: seller,
					sellerJobs: sellerJobs
				});
			});
		}, function () {
			var child = cp.fork(__dirname + '/worker-page-products');

			child.on('message', function (result) {
				processedData = result.processedData;
				pagedProcessedData = result.pagedProcessedData;
				totalPages = result.totalPages;
			});

			child.send(allTracks);
		});
	},
	getPagedProducts: function (page) {
		page = parseInt(page);
		if (page <= 0 || page > totalPages || !_.keys(pagedProcessedData).length) {
			return [];
		}
		return pagedProcessedData[page];
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
	refreshDeal: refreshDeal
};