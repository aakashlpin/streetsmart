'use strict';
var parser = require('cheerio');

module.exports = function(raw, res) {
    try {
        var $ = parser.load(raw);
        var scriptBlock = $('#redtube_flv_player script[type="text/javascript"]').text();
        var re = new RegExp(/flv_h264_url=https?[^\s<>"]+|www\.[^\s<>"]+&$/);
        var matches = scriptBlock.match(re);
        if (matches) {
            var downloadLink = decodeURIComponent(matches[0].split('&')[0].split('=')[1]);
            res.jsonp({
                downloadURL: downloadLink
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
