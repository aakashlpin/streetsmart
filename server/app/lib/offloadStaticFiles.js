'use strict';
var s3 = require('s3');
var moment = require('moment');
var config = require('../../config/config');
var logger = require('../../logger').logger;
var env = process.env.NODE_ENV || 'development';

var client = s3.createClient({
	s3Options: {
		accessKeyId: config.AWS_ACCESS_KEY_ID,
		secretAccessKey: config.AWS_SECRET_ACCESS_KEY
	}
});

function __sync (params, name) {
	var uploader = client.uploadDir(params);

	uploader.on('error', function (err) {
		logger.log('error', 'unable to sync:', err.stack);
	});

	uploader.on('end', function () {
		logger.log('info', 'done uploading %s at %s', name, moment().format('MMMM Do YYYY, h:mm:ss a'));
	});
}

function sync () {
	var logsSyncParams = {
		localDir: __dirname + '/../../logs',
		s3Params: {
			Bucket: 'cheapass-india',
			Prefix: 'logs-backup/' + env,
		}
	};

	/* ughoh. screenshots are uploaded by default Bubba-J */
	// var screenshotsSyncParams = {
	// 	localDir: __dirname + '/../../screenshots',
	// 	s3Params: {
	// 		Bucket: 'cheapass-india',
	// 		Prefix: 'screenshots-backup/' + env,
	// 	}
	// };

	__sync(logsSyncParams, 'logs');
	// __sync(screenshotsSyncParams, 'screenshots');
}

module.exports = {
	sync: sync
};
