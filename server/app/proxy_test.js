var request = require('request');
var fs = require('fs');
var parser  = require('cheerio');
var _ = require('underscore');
function getActualDOM($, domOptions) {
    return _.find(domOptions, function(maybeDOM) {
        return $(maybeDOM).length;
    });
}

request({
  url: 'http://www.amazon.in/dp/B00WU9Z9F0?tag=cheapass0a-21',
  proxy: 'http://e8ed50e08e444e22a3f13b546196a2c7:@proxy.crawlera.com:8010',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36'
  }
}, function (error, response, body) {
  console.log(response.statusCode);
  // fs.writeFileSync('content.html', body);
  //

  var $ = parser.load(body);
  var priceDOMs = ['#priceblock_ourprice', '#priceblock_dealprice',
  '#priceblock_saleprice', '#buyingPriceValue', '#actualPriceValue',
  '#priceBlock', '#price', '#buyNewSection .offer-price'];

  var priceDOM = getActualDOM($, priceDOMs);

  if ($(priceDOM).attr('id') === 'kindle_meta_binding_winner') {
      //TODO fix this. Amazon has malformed html which prevents $.find('.price')
      var matches = $(priceDOM).html().match(/([0-9]+(\.[0-9]{2}))/);
      priceFormatted = matches ? matches[0] : false;

  } else if (priceDOM) {
      priceParent = $(priceDOM).find('.currencyINR').parent();
      priceParent.find('.currencyINR').remove();
      priceParent.find('.currencyINRFallback').remove();
      price = priceParent.html();
      priceUnformatted = price.replace(/\s/g, '').replace(/,/gi, '');
      priceFormatted = priceUnformatted.indexOf('.') > 0 ?
      priceUnformatted.split('.')[0] : priceUnformatted;

  } else {
      priceFormatted = false;
  }

  console.log(priceFormatted);

  var imageDOM = $('#landingImage')
  var image = imageDOM ? imageDOM.data('old-hires') : '';
  if (!image) {
    var dynamicImages = imageDOM.data('a-dynamic-image');
    image = Object.keys(dynamicImages)[0];
  }

  console.log(image);
})
