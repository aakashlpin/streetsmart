
const s3 = require('s3');
const spawn = require('child_process').spawn;
const moment = require('moment');
const config = require('../../config/config');
const logger = require('../../logger').logger;
const _ = require('underscore');

function Deal(seller, adType) {
  const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36';
  let viewportSize = '1024x768';
  let pageUrl,
    selectors,
    screenshotName;

  if (seller === 'amazon') {
    pageUrl = `http://www.amazon.in/gp/goldbox/ref=nav_topnav_deals?${config.sellers.amazon.key}=${config.sellers.amazon.value}`;
    if (adType === 'banner') {
      selectors = [
        {
          fileId: 1,
          viewportSize: '2000x768',
          cssSelector: '.SINGLE-DEAL-LARGE',		// 680x310
        },
				// {
				// 	cssSelector: '.ONETHIRTYFIVE-HERO .gbwshoveler ul',
				// 	viewportSize: '700x500'
				// }
      ];
    } else if (adType === 'small') {
			// Work in progress
			// NOT ready to be used
      selectors = [
        {
          cssSelector: '.RIGHT-COL-SDL',	//300x220
        },
        {
          cssSelector: '#102_dealView0',	// 135x322
        },
        {
          cssSelector: '#102_dealView1',
        },
        {
          cssSelector: '#102_dealView2',
        },
        {
          cssSelector: '#102_dealView3',
        },
        {
          cssSelector: '#102_dealView4',
        },
      ];
    }
  }

  screenshotName = `${adType}_${seller}_${moment().format('YYMMDDHHmm')}.png`;

  const chosenSelector = selectors[_.sample(_.range(selectors.length))];
  let javascriptFilename;
  if (chosenSelector.fileId) {
    javascriptFilename = `${__dirname}/helpers/${adType}_${seller}_${chosenSelector.fileId}.js`;
  }

  viewportSize = chosenSelector.viewportSize || viewportSize;

  this.args = [
    '--uri', pageUrl,
    '--user-agent', userAgent,
    '--viewportsize', viewportSize,
    '--output', screenshotName,
    '--selector', chosenSelector.cssSelector,
  ];

  if (javascriptFilename) {
    this.args.push('--javascript-file', javascriptFilename);
  }

  this.s3Client = s3.createClient({
    s3Options: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  this.screenshotName = screenshotName;
  this.dealUrl = pageUrl;
}

Deal.prototype.getDeal = function (callback) {
  const screenshotDir = `${__dirname}/../../screenshots`;

  const screenshotProcess = spawn('capturejs', this.args, {
    cwd: screenshotDir,
  });

  screenshotProcess.on('error', (err) => {
    logger.log('error', 'error taking screenshot', err);
    callback(err, null);
  });

  screenshotProcess.on('close', () => {
    const params = {
      localFile: `${screenshotDir}/${this.screenshotName}`,
      s3Params: {
        Bucket: 'cheapass-india',
        Key: `screenshots/${this.screenshotName}`,
        ACL: 'public-read',
      },
    };

    const uploader = this.s3Client.uploadFile(params);

    uploader.on('error', (err) => {
      logger.log('error', 'unable to upload', err.stack);
      callback(err, null);
    });

    uploader.on('end', () => {
      logger.log('info', 'done uploading', this.screenshotName);
      callback(null, {
        dealUrl: this.dealUrl,
        dealImage: `${process.env.AWS_BUCKET_PREFIX}screenshots/${this.screenshotName}`,
      });
    });
  });
};

module.exports = {
  Deal,
};
