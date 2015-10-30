'use strict';
var _ = require('underscore');
module.exports = function($) {
	var priceDOM, imageDOM, nameDOM, price, name, image, response = {};
	try {
		priceDOM = $('[itemprop="price"]');
		price = priceDOM.text() || false;
		if (price) {
			price = parseInt(price.replace(',', ''), 10);
		}

		console.log('price', price);

		if (_.isNaN(price)) {
			price = false;
		}

		imageDOM = $('[itemprop="image"]');
		image = imageDOM.attr('src');

		console.log('image', image);

		nameDOM = $($('#productOverview [itemprop="name"]')[0]);
		name = nameDOM.text().replace(/^\s+|\s+$/g, '');

		console.log('name', name);
		response = {
			price: price,
			name: name,
			image: image
		};

	} catch(e) {
		console.log(e);
	}

	return response;
};
