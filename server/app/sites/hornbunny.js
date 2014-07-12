'use strict';
var _ = require('underscore');
var request = require('request');
var parser = require('cheerio');

module.exports = function(raw, res) {
    try {
        var $ = parser.load(raw);
        var re = new RegExp(/&settings=https?:\/\/[^\s<>"]+|www\.[^\s<>"]+/);
        var scriptTags = $('script[type="text/javascript"]');
        var settingsParam;
        _.find(scriptTags, function(scriptTag) {
            var scriptTagContent = $(scriptTag).text();
            var matches = scriptTagContent.match(re);
            if (matches) {
                settingsParam = matches[0];
                return matches;
            }
        });

        if (!settingsParam) {
            throw new Error('regexp failed');
        }

        var maskedURL = settingsParam.split('=')[1];
        var requestOptions = {
            url: maskedURL
        };

        request(requestOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                var preDownloadURLRe = new RegExp(/flvMask:https?:\/\/[^\s<>"]+|www\.[^\s<>"]+/);
                var preDownloadURL = body.match(preDownloadURLRe);
                if (preDownloadURL) {
                    preDownloadURL = preDownloadURL[0];
                }
                var downloadURL = preDownloadURL.split('flvMask:')[1];
                res.jsonp({
                    downloadURL: downloadURL
                });

            } else {
                throw new Error('request to secondary URL failed');
            }
        });

    } catch(e) {
        console.log('error-------------------------', e);
        res.jsonp({
            status: 'error'
        });
    }
};
