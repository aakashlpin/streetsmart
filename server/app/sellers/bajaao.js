'use strict';
var _ = require('underscore');
module.exports = function($) {
	var price = $('[itemprop="price"]').text().replace(',', '');
	price = parseInt(price, 10);
	if (_.isNaN(price)) {
		price = false;
	}

	var imageDOM = $('#image');

    return {
        price: price,
        name: $('[itemprop="name"] h1').text().replace(/^\s+|\s+$/g, ''),
        image: imageDOM.attr('src')
    };
};