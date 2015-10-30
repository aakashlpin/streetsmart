'use strict';
var _ = require('underscore');
module.exports = function($) {
	var nameDOM, imagesDOM, imageDOM, priceDOM, name, image, price, response = {};
	try {
		priceDOM = $('[itemprop="price"]');
		price = priceDOM.attr('content') || false;
		if (price) {
			price = price.replace(/,/g, '');
			price = parseInt(price, 10);
			if (_.isNaN(price)) {
				price = false;
			}
		}

		imagesDOM = $('[itemprop="image"]');
		if (imagesDOM.length > 1) {
			imageDOM = $(imagesDOM[0]);
		} else {
			imageDOM = imagesDOM;
		}

		image = imageDOM.attr('_src') || imageDOM.attr('src');

		nameDOM = $('[itemprop="name"]');
		name = nameDOM.text().replace(/^\s+|\s+$/g, '');

		response = {
			price: price,
			name: name,
			image: image
		};

	} catch(e) {}

	return response;
};
