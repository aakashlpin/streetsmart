
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
    price = priceDOM.text() || false;

    if (price) {
      price = parseInt(price.replace(/,/g, ''), 10);
    }

    if (_.isNaN(price)) {
      price = false;
    }

    nameDOM = $('.content_inner .proTitle_desk');

    name = nameDOM.text().replace(/^\s+|\s+$/g, '');

    imageDOM = $('#main_prod_image');

    image = imageDOM.attr('src');

    response = {
      price,
      name,
      image,
    };
  } catch (e) {

  }

  return response;
};
