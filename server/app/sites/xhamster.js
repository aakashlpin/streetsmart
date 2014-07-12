'use strict';
var parser = require('cheerio');
var http = require('http');

module.exports = function(raw, res) {
    try {
        var $ = parser.load(raw);
        var downloadTag = $('video');
        var downloadLink = downloadTag.attr('file');
        // console.log(downloadLink);
        http.get(downloadLink, function(response) {
            var downloadURL;
            // console.log(response.statusCode);
            if (response.statusCode > 300 && response.statusCode < 400) {
                downloadURL = response.headers.location;
                // console.log(downloadURL);
            } else {
                downloadURL = downloadLink;
            }

            res.jsonp({
                downloadURL: downloadURL
            });
        });

    } catch(e) {
        console.log('error-------------------------', e);
        res.jsonp({
            status: 'error'
        });
    }
};
