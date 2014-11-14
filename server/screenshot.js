'use strict';
var s3 = require('s3');
var spawn = require('child_process').spawn;

var screenShotName = 'ss_amazon_' + Date.now() + '.png';

var client = s3.createClient({
	s3Options: {
		accessKeyId: 'AKIAIFTVMHU7YXZR6HUQ',
		secretAccessKey: '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',
	}
});

var args = [
	'--uri', 'http://www.amazon.in/gp/goldbox/ref=nav_topnav_deals',
	'--user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36',
	'--viewportsize', '1024x768',
	'--output', screenShotName,
];

args.push('--selector', '.SINGLE-DEAL-LARGE');
// args.push('--selector', '.RIGHT-COL-SDL');
args.push('--javascript-file', __dirname + '/amazon_hide.js');

var screenShotProcess = spawn('capturejs', args, {
	cwd: __dirname + '/screenshots'
});

screenShotProcess.on('error', function (err) {
	console.log('err', err);
});

screenShotProcess.on('close', function() {
	console.log('screenshot taken');
	var params = {
		localFile: __dirname + '/screenshots/' + screenShotName,
		s3Params: {
			Bucket: 'cheapass-india',
			Key: screenShotName,
			ACL: 'public-read'
		}
	};

	var uploader = client.uploadFile(params);
	uploader.on('error', function(err) {
		console.error('unable to upload:', err.stack);
	});

	uploader.on('end', function() {
		console.log('done uploading', screenShotName);
	});
});