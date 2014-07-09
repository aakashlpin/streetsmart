'use strict';
var _ = require('underscore');
module.exports = function($) {
    var nameDOM, imageDOM, priceDOM, name, image, price, response = {};
    try {
        nameDOM = $('[itemprop="name"]');
        if (nameDOM.length > 1) {
            nameDOM = $(nameDOM[0]);
        }
        name = nameDOM.text().replace(/^\s+|\s+$/g, '');

        priceDOM = $('meta[itemprop="price"]');
        price = priceDOM.attr('content') || false;
		if (price) {
			price = parseInt(price.replace(',', ''), 10);
		}

		if (_.isNaN(price)) {
			price = false;
		}

        imageDOM = $('.product-image');
        image = imageDOM.attr('src');
		response = {
			price: price,
			name: name,
			image: image
		};

    } catch(e) {}

    return response;
};
