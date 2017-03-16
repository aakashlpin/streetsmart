
const request = require('request');
const _ = require('underscore');
_.str = require('underscore.string');
const config = require('../../config/config');
const logger = require('../../logger').logger;
const sellerUtils = require('../utils/seller');
const mongoose = require('mongoose');
const SiteModel = mongoose.model('Site');

function processSite(url, res) {
  logger.log('info', 'scrape', { url });
  const site = sellerUtils.getVideoSiteFromURL(url);

  setTimeout(() => {
        // log the request in the db at the end of current event queue
    SiteModel.post({ site, url }, () => {});
  }, 0);

  const requestOptions = {
    url,
  };

  if (site.indexOf('.') >= 0) {
        // it's one of the websites which youtube-dl can get for us
    require('../sites/youtube-dl')(requestOptions, res);
    return;
  }

  if (config.videoSites[site].requiresUserAgent) {
    requestOptions.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36',
    };
  }

  request(requestOptions, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      require(`../sites/${site}`)(body, res);
    } else {
      logger.log('error', 'request module', { error, response });
      res.jsonp({ status: 'error' });
    }
  });
}

exports.processSite = processSite;
