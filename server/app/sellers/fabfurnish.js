'use strict';
var _ = require('underscore');
module.exports = function($) {
	var price = $('[itemprop="price"]').attr('content') || false;
	if (price) {
		price = parseInt(price.replace(',', ''), 10);
	}

	if (_.isNaN(price)) {
		price = false;
	}

	var imageDOM = $('#imgThumb_1 img');

    return {
        price: price,
        name: $('[itemprop="name"]').text().replace(/^\s+|\s+$/g, ''),
        image: imageDOM.attr('longdesc')
    };
};
