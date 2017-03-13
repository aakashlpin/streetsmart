const _ = require('underscore');
const logger = require('../../logger').logger;

module.exports = function ($) {
  let priceDOM,
    imageDOM,
    nameDOM,
    price,
    name,
    image,
    response = {};
  try {
    priceDOM = $('[itemprop="price"]');
    price = priceDOM.text() || false;
    if (price) {
      price = parseInt(price.replace(/,/g, ''), 10);
    }

    if (_.isNaN(price)) {
      price = false;
    }

    imageDOM = $('[itemprop="image"]');
    image = imageDOM.attr('src');

    nameDOM = $($('#productOverview [itemprop="name"]')[0]);
    name = nameDOM.text().replace(/^\s+|\s+$/g, '');

    response = {
      price,
      name,
      image,
    };
  } catch (e) {
    logger.log('error', 'error with scraping snapdeal', e);
  }

  return response;
};
