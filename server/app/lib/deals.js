'use strict';
var s3 = require('s3');
var spawn = require('child_process').spawn;
var moment = require('moment');
var config = require('../../config/config');
var logger = require('../../logger').logger;

function Deal(seller, adType) {
	var userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36';
	var viewportSize = '1024x768';
	var pageUrl, selectors, screenshotName;

	if (seller === 'amazon') {
		pageUrl = 'http://www.amazon.in/gp/goldbox/ref=nav_topnav_deals';
		if (adType === 'banner') {
			selectors = [
				{
					fileId: 1,
					cssSelector: '.SINGLE-DEAL-LARGE'		//680x310
				}
			];
		} else if (adType === 'small') {
			//Work in progress
			//NOT ready to be used
			selectors = [
				{
					cssSelector: '.RIGHT-COL-SDL',	//300x220
				},
				{
					cssSelector: '#102_dealView0'	//135x322
				},
				{
					cssSelector: '#102_dealView1'
				},
				{
					cssSelector: '#102_dealView2'
				},
				{
					cssSelector: '#102_dealView3'
				},
				{
					cssSelector: '#102_dealView4'
				}
			];
		}
	}

	screenshotName = adType + '_' + seller + '_' + moment().format('YYMMDDHHmm') + '.png';

	var chosenSelector = selectors[0];	//TODO make it random
	var javascriptFilename;
	if (chosenSelector.fileId) {
		javascriptFilename = __dirname + '/helpers/' + adType + '_' + seller + '_' + chosenSelector.fileId + '.js';
	}

	this.args = [
		'--uri', pageUrl,
		'--user-agent', userAgent,
		'--viewportsize', viewportSize,
		'--output', screenshotName,
		'--selector', chosenSelector.cssSelector
	];

	if (javascriptFilename) {
		this.args.push('--javascript-file', javascriptFilename);
	}

	this.s3Client = s3.createClient({
		s3Options: {
			accessKeyId: config.AWS_ACCESS_KEY_ID,
			secretAccessKey: config.AWS_SECRET_ACCESS_KEY
		}
	});

	this.screenshotName = screenshotName;
	this.dealUrl = pageUrl;
}

Deal.prototype.getDeal = function (callback) {
	var screenshotDir = __dirname + '/../../screenshots';

	var screenshotProcess = spawn('capturejs', this.args, {
		cwd: screenshotDir
	});

	screenshotProcess.on('error', function (err) {
		logger.log('error', 'error taking screenshot', err);
		callback(err, null);
	});

	screenshotProcess.on('close', function() {
		var params = {
			localFile: screenshotDir + '/' + this.screenshotName,
			s3Params: {
				Bucket: 'cheapass-india',
				Key: 'screenshots/' + this.screenshotName,
				ACL: 'public-read'
			}
		};

		var uploader = this.s3Client.uploadFile(params);

		uploader.on('error', function(err) {
			logger.log('error', 'unable to upload', err.stack);
			callback(err, null);
		});

		uploader.on('end', function() {
			logger.log('info', 'done uploading', this.screenshotName);
			callback(null, {
				dealUrl: this.dealUrl,
				dealImage: config.AWS_BUCKET_PREFIX + 'screenshots/' + this.screenshotName
			});
		}.bind(this));
	}.bind(this));
};

module.exports = {
	Deal: Deal
};