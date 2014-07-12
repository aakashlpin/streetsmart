'use strict';
var _ = require('underscore');
var parser = require('cheerio');

module.exports = function(raw, res) {
    try {
        var $ = parser.load(raw);
        var flashPlayer = $('#flash-player-embed');
        var flashVars = flashPlayer.attr('flashvars');

        var re = new RegExp(/flv_url=https?[^\s<>"]+|www\.[^\s<>"]+;$/);
        var matches = flashVars.match(re);
        if (matches) {
            var match, encodedURL, decodedURL;
            match = matches[0];
            encodedURL = match.split('=')[1];
            decodedURL = decodeURIComponent(encodedURL);
            res.jsonp({
                downloadURL: decodedURL
            });
        } else {
            throw new Error('regexp failed');
        }


    } catch(e) {
        console.log('error-------------------------', e);
        res.jsonp({
            status: 'error'
        });
    }
};
