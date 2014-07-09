'use strict';
module.exports = function($) {
    var productNameDOM = $('[itemprop="name"]');
    if (productNameDOM.length > 1) {
        productNameDOM = $(productNameDOM[0]);
    }
    return {
        price: $('meta[itemprop="price"]').attr('content'),
        name: productNameDOM.text().replace(/^\s+|\s+$/g, ''),
        image: $('.product-image').attr('src')
    };
};
