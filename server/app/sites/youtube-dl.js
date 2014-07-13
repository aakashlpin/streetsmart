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

        //putting this crashes the app. Uncomment by care
        // cp.stderr.on('data', function (data) {
        //     console.log('stderr');
        //
        //     throw new Error('stderr: ' + data);
        // });

        cp.on('close', function () {
            //process the stdout as it is inconsistent
            var processedStdout = [];
            _.each(allURLsStdout, function(urlStdout) {
                if (urlStdout.indexOf('http') !== 0 && urlStdout.indexOf('://') > 0) {
                    var nameURLCombo = urlStdout.split('\n');
                    processedStdout.push(nameURLCombo[0], nameURLCombo[1]);
                } else {
                    processedStdout.push(urlStdout);
                }
            });

            //every alternate index is name and url
            //making pairs here in an object and putting it in an array
            var indexRange = _.range(0, processedStdout.length, 2);
            _.each(indexRange, function(i) {
                allURLs.push({
                    name: processedStdout[i],
                    downloadURL: processedStdout[i+1]
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
