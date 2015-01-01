'use strict';
var _ = require('underscore');
_.str = require('underscore.string');

function getLeastPriceFromHistory (history) {
	if (!history.length) {
		return null;
	}
	return _.sortBy(history, 'price')[0];
}

process.on('message', function (data) {
	var hotCache = {};
	var seller = data.seller;
	var sellerJobs = data.sellerJobs;
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
				dataInCache._id = leastPriceForJob._id ? leastPriceForJob._id.toHexString(): dataInCache._id;
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

	process.send(_.values(hotCache));
	process.exit(0);
});