
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
    price = priceDOM.text().replace(',', '');
    price = parseInt(price, 10);
    if (_.isNaN(price)) {
      price = false;
    }

    nameDOM = $('[itemprop="name"] h1');
    name = nameDOM.text().replace(/^\s+|\s+$/g, '');

    imageDOM = $('#image');
    image = imageDOM.attr('src');

    response = {
      price,
      name,
      image,
    };
  } catch (e) {}

  return response;
};
