
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
    price = parseInt(priceDOM.text(), 10);
    if (_.isNaN(price)) {
      price = false;
    }

    nameDOM = $('[itemprop="name"]');
    name = nameDOM.text().replace(/^\s+|\s+$/g, '');

    imageDOM = $('[itemprop="image"]');
    image = imageDOM.attr('src');

    response = {
      price,
      name,
      image,
    };
  } catch (e) {}

  return response;
};
