
const _ = require('underscore');
module.exports = function ($) {
  let nameDOM,
    imageDOM,
    priceDOM,
    name,
    image,
    price,
    response = {};
  try {
    priceDOM = $('[itemprop="price"]');
    price = priceDOM.attr('content') || false;
    if (price) {
      price = parseInt(price.replace(/,/g, ''), 10);
    }

    if (_.isNaN(price)) {
      price = false;
    }

    nameDOM = $('[itemprop="name"]');
    name = nameDOM.text().replace(/^\s+|\s+$/g, '');

    imageDOM = $('#imgThumb_1 img');
    image = imageDOM.attr('longdesc');

    response = {
      price,
      name,
      image,
    };
  } catch (e) {

  }

  return response;
};
