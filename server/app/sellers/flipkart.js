'use strict';
module.exports = function($) {
    return {
        price: $('meta[itemprop="price"]').attr('content'),
        name: $('[itemprop="name"]').text().replace(/^\s+|\s+$/g, ''),
        image: $('.product-image').attr('src')
    };
};
