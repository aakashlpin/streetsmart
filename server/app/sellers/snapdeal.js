'use strict';
var _ = require('underscore');
module.exports = function($) {
	var priceDOM, imageDOM, nameDOM, price, name, image, response = {};
	try {
		priceDOM = $('.buyContainer [itemprop="price"]');
		price = priceDOM.text() || false;
		if (price) {
			price = parseInt(price.replace(',', ''), 10);
		}

		if (_.isNaN(price)) {
			price = false;
		}

		imageDOM = $('[itemprop="image"]');
		image = imageDOM.attr('src');

		nameDOM = $('.productTitle [itemprop="name"]');
		name = nameDOM.text().replace(/^\s+|\s+$/g, '');

		response = {
			price: price,
			name: name,
			image: image
		};

	} catch(e) {}

	return response;
};
