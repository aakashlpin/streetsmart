'use strict';
var _ = require('underscore');
module.exports = function($) {
	var priceDOM, price;
	priceDOM = $('.price').find('span').remove();	//might contain offers
	price = priceDOM.split('Rs.')[1].replace('/\s/g', '').replace(',', '');
	if (price) {
		price = parseInt(price, 10);
	}

	if (_.isNaN(price) || !price) {
		price = false;
	}

    return {
        price: price,
        name: $('.title').text().replace(/^\s+|\s+$/g, ''),
        image: $('meta[itemprop="image"]').attr('content')
    };
};