'use strict';
var _ = require('underscore');
module.exports = function($) {
	var price = $('.buyContainer [itemprop="price"]').text().replace(',', '');
	price = parseInt(price, 10);
	if (_.isNaN(price)) {
		price = false;
	}

	var imageDOM = $('[itemprop="image"]');

    return {
        price: price,
        name: $('[itemprop="name"]').text().replace(/^\s+|\s+$/g, ''),
        image: imageDOM.attr('src')
    };
};