var config = require('../../config/config');
var Twit = require('twit');
var base64 = require('node-base64-image');
var kue = require('kue');
var BitlyAPI = require('node-bitlyapi');
var logger = require('../../logger').logger;

var Bitly = new BitlyAPI({
    client_id: config.BITLY.CLIENT_ID,
    client_secret: config.BITLY.CLIENT_SECRET
});

var Store = require('./store').Store,
  TwitterFeedStore = new Store({
    ns: 'tweetFingerprint',
    ttlMins: 30
  });

Bitly.setAccessToken(config.BITLY.ACCESS_TOKEN);

var TwitterQueue = kue.createQueue();

var T = new Twit({
    consumer_key:         config.TWITTER_FEED.CONSUMER_KEY
  , consumer_secret:      config.TWITTER_FEED.CONSUMER_SECRET
  , access_token:         config.TWITTER_FEED.ACCESS_TOKEN
  , access_token_secret:  config.TWITTER_FEED.ACCESS_TOKEN_SECRET
});

var base64encoderOptions = {string: true};

TwitterQueue.process('twitterFeed', function (job, done) {
  var alert = job.data;
  if (alert.productName.length > 62) {
    alert.productName = alert.productName.substr(0,62) + '...';
  }

  base64.base64encoder(alert.productImage, base64encoderOptions, function (err, b64content) {
      if (err) { console.log(err); return done(err); }
      // first we must post the media to Twitter
      T.post('media/upload', { media_data: b64content }, function (err, data, response) {

        // now we can reference the media and post a tweet (media will attach to the tweet)
        var mediaIdStr = data.media_id_string;

        Bitly.shortenLink(alert.productURL, function(err, result) {
          if (err) { console.log(err); return done(err); }
          result = JSON.parse(result);
          var status = alert.productName + ' is now available at ₹' + alert.currentPrice + ' ' + result.data.url;
          var params = { status: status, media_ids: [mediaIdStr] }
          T.post('statuses/update', params, function (err, data, response) {
            if (err) { console.log(err); return done(err); }
            done();
          });
        });
      });
  });
});

function hashCode (str) {
  var hash = 0, i, chr, len;
  if (str.length == 0) return hash;
  for (i = 0, len = str.length; i < len; i++) {
    chr   = str.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

function postStatus (alert) {
  var canProcess = true;

  ['currentPrice', 'productName', 'productImage', 'productURL'].forEach(function (requiredKey) {
    if (!(requiredKey in alert)) {
      canProcess = false;
    }
  });

  if (!canProcess) {
    return;
  }

  var alertIdentifier = {
    currentPrice: alert.currentPrice,
    productName: alert.productName,
    productURL: alert.productURL
  };

  var alertFingerprint = hashCode(JSON.stringify(alertIdentifier));
  TwitterFeedStore.get(alertFingerprint, function (error, fingerprint) {
    if (error) {
      return logger.log('error', 'error in get on TwitterFeedStore', error);
    }

    if (!fingerprint) {
      TwitterQueue.create('twitterFeed', alert).save();
      TwitterFeedStore.set(alertFingerprint, {});
    }
  });

}

module.exports = {
  postStatus: postStatus
}
