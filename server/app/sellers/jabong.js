'use strict';
var _ = require('underscore');
module.exports = function($) {
	var price = parseInt($('[itemprop="price"]').text(), 10);
	if (_.isNaN(price)) {
		price = false;
	}

    return {
        price: price,
        name: $('[itemprop="name"]').text().replace(/^\s+|\s+$/g, ''),
        image: $('[itemprop="image"]').attr('src')
    };
};