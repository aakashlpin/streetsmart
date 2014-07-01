'use strict';
var _ = require('underscore');
module.exports = function($) {
	var priceDOM, price;
	priceDOM = $('.summary .price');
	priceDOM.find('span').remove();	//might contain offers
	price = priceDOM.text().split('Rs.')[1].replace('/\s/g', '').replace(',', '');
	if (price) {
		price = parseInt(price, 10);
	}

	if (_.isNaN(price) || !price) {
		price = false;
	}

    return {
        price: price,
        name: $('.summary .title').text().replace(/^\s+|\s+$/g, ''),
        image: $('meta[itemprop="image"]').attr('content')
    };
};
