
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
    priceDOM = $('.summary .price .final');
		// priceDOM.find('span').remove();	//might contain offers
    price = priceDOM.text().split('Rs.')[1].replace('/\s/g', '').replace(',', '');
    if (price) {
      price = parseInt(price, 10);
    }

    if (_.isNaN(price) || !price) {
      price = false;
    }

    nameDOM = $('.summary .title');
    name = nameDOM.text().replace(/^\s+|\s+$/g, '');

    imageDOM = $('meta[itemprop="image"]');
    image = imageDOM.attr('content');

    response = {
      price,
      name,
      image,
    };
  } catch (e) {}

  return response;
};
