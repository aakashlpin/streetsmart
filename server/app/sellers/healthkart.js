'use strict';
var _ = require('underscore');
module.exports = function($) {
	var nameDOM, imageDOM, priceDOM, name, image, price, response = {};
	try {
		priceDOM = $('[itemprop="price"]');
		price = priceDOM.attr('content') || false;

		if (price) {
			price = parseInt(price.replace(/,/g, ''), 10);
		}

		if (_.isNaN(price)) {
			price = false;
		}

		nameDOM = $('.mainContainer .variant-name');
		name = nameDOM.text().replace(/^\s+|\s+$/g, '');

		imageDOM = $('.mainContainer .variant-image img');
		image = imageDOM.attr('src');

		response = {
			price: price,
			name: name,
			image: image
		};
	} catch(e) {

	}

	return response;
};
