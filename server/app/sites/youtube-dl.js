'use strict';
var spawn = require('child_process').spawn;
var  _ = require('underscore');

module.exports = function(req, res) {
    var url = req.url;
    try {
        var cp = spawn('youtube-dl', ['-e', '-g', url]);
        var allURLsStdout = [], allURLs = [];
        cp.stdout.on('data', function(data) {
            var buff = new Buffer(data);
            var stringifiedBuff = buff.toString('utf8');
            allURLsStdout.push(stringifiedBuff);
        });

        cp.stderr.on('data', function (data) {
            throw new Error('stderr: ' + data);
        });

        cp.on('close', function () {
            //every alternate index is name and url
            //making pairs here in an object and putting it in an array
            console.log(allURLsStdout);
            var indexRange = _.range(0, allURLsStdout.length, 2);
            _.each(indexRange, function(i) {
                allURLs.push({
                    name: allURLsStdout[i],
                    downloadURL: allURLsStdout[i+1]
                });
            });

            res.jsonp({
                downloadURLs: allURLs
            });
        });

    } catch(e) {
        console.log('error-------------------------', e);
        res.jsonp({
            status: 'error'
        });
    }
};
