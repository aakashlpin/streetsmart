'use strict';
var _ = require('underscore');
module.exports = function($) {
	var priceDOM, imageDOM, nameDOM, price, name, image, response = {};
	try {
		priceDOM = $('[itemprop="price"]');
		imageDOM = $('[itemprop="image"]');
		nameDOM = $('[itemprop="name"]');

		price = parseInt(priceDOM.text().split('Rs.')[1].replace(',', ''), 10);

		if (_.isNaN(price)) {
			price = false;
		}

		name = nameDOM.text().replace(/^\s+|\s+$/g, '');
		image = imageDOM.attr('src');

		response = {
			price: price,
			name: name,
			image: image
		};

	} catch(e) {}

	return response;
};
