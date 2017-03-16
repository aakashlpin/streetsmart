
const spawn = require('child_process').spawn;
const _ = require('underscore');

module.exports = function (req, res) {
  const url = req.url;
  try {
    const cp = spawn('youtube-dl', ['-e', '-g', url]);
    let allURLsStdout = [],
      allURLs = [];
    cp.stdout.on('data', (data) => {
      const buff = new Buffer(data);
      const stringifiedBuff = buff.toString('utf8');
      allURLsStdout.push(stringifiedBuff);
    });

        // putting this crashes the app. Uncomment by care
        // cp.stderr.on('data', function (data) {
        //     logger.log('stderr');
        //
        //     throw new Error('stderr: ' + data);
        // });

    cp.on('close', () => {
            // process the stdout as it is inconsistent
      const processedStdout = [];
      _.each(allURLsStdout, (urlStdout) => {
        if (urlStdout.indexOf('http') !== 0 && urlStdout.indexOf('://') > 0) {
          const nameURLCombo = urlStdout.split('\n');
          processedStdout.push(nameURLCombo[0], nameURLCombo[1]);
        } else {
          processedStdout.push(urlStdout);
        }
      });

            // every alternate index is name and url
            // making pairs here in an object and putting it in an array
      const indexRange = _.range(0, processedStdout.length, 2);
      _.each(indexRange, (i) => {
        allURLs.push({
          name: processedStdout[i],
          downloadURL: processedStdout[i + 1],
        });
      });

      res.jsonp({
        downloadURLs: allURLs,
      });
    });
  } catch (e) {
    console.log('error-------------------------', e);
    res.jsonp({
      status: 'error',
    });
  }
};
