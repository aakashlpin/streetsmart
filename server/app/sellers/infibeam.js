'use strict';
var _ = require('underscore');
module.exports = function($) {
	var price = $('[itemprop="price"]').attr('content').replace(',', '');
	price = parseInt(price, 10);
	if (_.isNaN(price)) {
		price = false;
	}

	var imagesDOM = $('[itemprop="image"]');
	var imageDOM;
	if (imagesDOM.length > 1) {
		imageDOM = $(imagesDOM[0]);
	} else {
		imageDOM = imagesDOM;
	}

    return {
        price: price,
        name: $('[itemprop="name"]').text().replace(/^\s+|\s+$/g, ''),
        image: imageDOM.attr('src')
    };
};