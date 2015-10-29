var config = require('../../config/config');
var Twit = require('twit');
var base64 = require('node-base64-image');
var kue = require('kue');
var BitlyAPI = require('node-bitlyapi');
var Bitly = new BitlyAPI({
    client_id: config.BITLY.CLIENT_ID,
    client_secret: config.BITLY.CLIENT_SECRET
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

  TwitterQueue.create('twitterFeed', alert).save();
}

module.exports = {
  postStatus: postStatus
}
