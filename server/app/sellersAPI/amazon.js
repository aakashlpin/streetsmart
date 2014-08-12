'use strict';


/*******************

amazon.in is not a supported website for Product Advertising API by Amazon

********************/

var util = require('util'),
OperationHelper = require('../../non_npm_packages/node-apac/lib/apac').OperationHelper;
var logger = require('../../logger').logger;

var opHelper = new OperationHelper({
    awsId:     'AKIAIUROYV46SDBPV4UA',
    awsSecret: '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',
    assocId:   'cheapass0a-21'
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

        var price, name, image;
        try {
            console.log(util.inspect(results, { showHidden: true, depth: null, colors: true }));
            var itemAttrs = results.ItemLookupResponse.Items[0].Item[0].ItemAttributes[0];
            console.log('itemAttrs');
            var imageParent = results.ItemLookupResponse.Items[0].Item[0].MediumImage[0];
            console.log('imageParent');
            name = itemAttrs.Title[0];
            console.log('name');
            price = itemAttrs.ListPrice[0].Amount[0];	//Options =>Amount[0], CurrencyCode[0], FormattedPrice[0]
            console.log('price');
            image = imageParent.URL[0];
            console.log('image');
            var response = {
                name: name,
                price: price,
                image: image
            };

            callback(null, response);
        } catch(e) {
            console.log(e);
        }
    });
};
