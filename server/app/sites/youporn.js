'use strict';
var parser = require('cheerio');

module.exports = function(raw, res) {
    try {
        var $ = parser.load(raw);
        var downloadLinksList = $('ul.downloadList li');
        //Good video mp4 video for desktop devices on second number
        var downloadLink = $(downloadLinksList[1]).find('a').attr('href');
        res.jsonp({
            downloadURL: downloadLink
        });

    } catch(e) {
        console.log('error-------------------------', e);
        res.jsonp({
            status: 'error'
        });
    }
};
