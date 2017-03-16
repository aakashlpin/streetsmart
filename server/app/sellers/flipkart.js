
const _ = require('underscore');
function getActualDOM($, domOptions) {
  return _.find(domOptions, maybeDOM => $(maybeDOM).length);
}

module.exports = function ($) {
  let priceDOMs;
  let nameDOM,
    imageDOM,
    priceDOM,
    name,
    image,
    price,
    response;
  try {
    nameDOM = $('[itemprop="name"]');
    if (nameDOM.length > 1) {
      nameDOM = $(nameDOM[0]);
    }
    name = nameDOM.text().replace(/^\s+|\s+$/g, '');

    priceDOMs = ['.pricing .selling-price'];
    priceDOM = getActualDOM($, priceDOMs);
    price = $(priceDOM).html();

    if (price) {
      price = parseInt(price.replace('Rs. ', '').replace(/,/g, ''), 10);
    }

    if (_.isNaN(price)) {
      price = false;
    }

    imageDOM = $('.productImages .productImage');
    if (imageDOM.length > 1) {
      imageDOM = $(imageDOM[0]);
    }

    image = imageDOM.data('src');
    response = {
      price,
      name,
      image,
    };
  } catch (e) {}

  return response;
};
