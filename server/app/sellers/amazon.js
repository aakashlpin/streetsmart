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
        // put '#kindle_meta_binding_winner' after '#actualPriceValue' for kindle books
        priceDOMs = ['#priceblock_ourprice', '#priceblock_dealprice',
        '#priceblock_saleprice', '#buyingPriceValue', '#actualPriceValue',
        '#priceBlock', '#price', '#buyNewSection .offer-price'];
        nameDOMs = ['#productTitle', '#btAsinTitle > span', '#btAsinTitle'];
        imageDOMs = ['#imgTagWrapperId > img', '#landingImage', '#prodImage', '#kib-ma-container-0 > img', '#imgBlkFront'];

        nameDOM     = getActualDOM($, nameDOMs);
        imageDOM    = getActualDOM($, imageDOMs);
        priceDOM    = getActualDOM($, priceDOMs);

        name = nameDOM ? $(nameDOM).text() : '';
        name = name.replace(/<(?:.|\n)*?>/gm, '').replace(/^\s+|\s+$/g, '');
        image = imageDOM ? $(imageDOM).data('old-hires') : '';

        if ($(priceDOM).attr('id') === 'kindle_meta_binding_winner') {
            //TODO fix this. Amazon has malformed html which prevents $.find('.price')
            var matches = $(priceDOM).html().match(/([0-9]+(\.[0-9]{2}))/);
            priceFormatted = matches ? matches[0] : false;

        } else if (priceDOM) {
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

    } catch(e) {
        logger.log('error', e);
    }

    return response;
};
