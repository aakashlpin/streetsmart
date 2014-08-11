'use strict';

var util = require('util'),
    OperationHelper = require('../../non_npm_packages/node-apac/lib/apac').OperationHelper;

var opHelper = new OperationHelper({
    awsId:     'AKIAJDI4MVCUKEBQI63A',
    awsSecret: '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',
    assocId:   '100freebooks-20'
});

function getDeepLinkURL(url) {
    // extract ASIN from the url
    // http://stackoverflow.com/questions/1764605/scrape-asin-from-amazon-url-using-javascript
    // need to &cor=US to prevent 3g delivery price from showing up on Kindle books
    var asin = url.match('/([a-zA-Z0-9]{10})(?:[/?]|$)');
    if (asin && asin[1]) {
    	return asin[1];
    }
    return null;
}


module.exports = function(url, callback) {
	var asin = getDeepLinkURL(url);
	if (!asin) {
		return callback('err');
	}

	opHelper.execute('ItemLookup', {
		'IdType': 'ASIN',
		'ItemId': asin,
		'ResponseGroup': 'Images,ItemAttributes'
	}, function(err, results) {
		if (err) {
			logger.log('error', 'error making apac request', err);
			return callback('error making apac request');
		}
	    console.log(util.inspect(results, { showHidden: true, depth: null, colors: true }));
	    callback('err');
	});
};