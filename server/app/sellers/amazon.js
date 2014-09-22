'use strict';
var _ = require('underscore');
var logger = require('../../logger').logger;

function getActualDOM($, domOptions) {
    return _.find(domOptions, function(maybeDOM) {
        return $(maybeDOM).length;
    });
}

module.exports = function($) {
    var priceDOMs, nameDOMs, imageDOMs;
    var nameDOM, imageDOM, priceDOM, name, image, price, priceParent,
    priceUnformatted, priceFormatted;
    var response;

    try {
        priceDOMs = ['#priceblock_ourprice', '#priceblock_saleprice',
        '#priceblock_dealprice', '#buyingPriceValue', '#actualPriceValue',
        '#priceBlock', '#price', '#buyNewSection .offer-price'];
        nameDOMs = ['#productTitle', '#btAsinTitle > span', '#btAsinTitle'];
        imageDOMs = ['#landingImage', '#prodImage', '#kib-ma-container-0 > img', '#imgBlkFront'];

        nameDOM     = getActualDOM($, nameDOMs);
        imageDOM    = getActualDOM($, imageDOMs);
        priceDOM    = getActualDOM($, priceDOMs);

        name = nameDOM ? $(nameDOM).text() : '';
        name = name.replace(/<(?:.|\n)*?>/gm, '').replace(/^\s+|\s+$/g, '');
        image = imageDOM ? $(imageDOM).attr('src') : '';

        if (priceDOM) {
            priceParent = $(priceDOM).find('.currencyINR').parent();
            priceParent.find('.currencyINR').remove();
            priceParent.find('.currencyINRFallback').remove();
            price = priceParent.html();
            priceUnformatted = price.replace(/\s/g, '').replace(/,/gi, '');
            priceFormatted = priceUnformatted.indexOf('.') > 0 ?
            priceUnformatted.split('.')[0] : priceUnformatted;

        } else {
            priceFormatted = false;
        }

        response = {
            name: name,
            price: priceFormatted,
            image: image
        };

    } catch(e) {}

    return response;
};
