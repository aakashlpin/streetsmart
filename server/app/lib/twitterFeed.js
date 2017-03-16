const Twit = require('twit');
const base64 = require('node-base64-image');
const kue = require('kue');
const BitlyAPI = require('node-bitlyapi');
const logger = require('../../logger').logger;
const Store = require('./store').Store;

const Bitly = new BitlyAPI({
  client_id: process.env.BITLY_CLIENT_ID,
  client_secret: process.env.BITLY_CLIENT_SECRENT,
});

const TwitterFeedStore = new Store({
  ns: 'tweetFingerprint',
  ttlMins: 30,
});

Bitly.setAccessToken(process.env.BITLY_ACCESS_TOKEN);

const TwitterQueue = kue.createQueue();

const T = new Twit({
  consumer_key: process.env.TWITTER_BOT_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_BOT_CONSUMER_SECRET,
  access_token: process.env.TWITTER_BOT_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_BOT_ACCESS_TOKEN_SECRET,
});

const base64encoderOptions = { string: true };

TwitterQueue.process('twitterFeed', (job, done) => {
  const alert = job.data;
  if (alert.productName.length > 62) {
    alert.productName = `${alert.productName.substr(0, 62)}...`;
  }

  base64.encode(alert.productImage, base64encoderOptions, (err, b64content) => {
    if (err) { logger.log(err); return done(err); }
      // first we must post the media to Twitter
    T.post('media/upload', { media_data: b64content }, (err, data, response) => {
        // now we can reference the media and post a tweet (media will attach to the tweet)
      const mediaIdStr = data.media_id_string;

      Bitly.shortenLink(alert.productURL, (err, result) => {
        if (err) { logger.log(err); return done(err); }
        result = JSON.parse(result);
        const status = `${alert.productName} is now available at ₹${alert.currentPrice} ${result.data.url}`;
        const params = { status, media_ids: [mediaIdStr] };
        T.post('statuses/update', params, (err, data, response) => {
          if (err) { logger.log(err); return done(err); }
          done();
        });
      });
    });
  });
});

function hashCode(str) {
  let hash = 0,
    i,
    chr,
    len;
  if (str.length == 0) return hash;
  for (i = 0, len = str.length; i < len; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

function postStatus(alert) {
  let canProcess = true;

  ['currentPrice', 'productName', 'productImage', 'productURL'].forEach((requiredKey) => {
    if (!(requiredKey in alert)) {
      canProcess = false;
    }
  });

  if (!canProcess) {
    return;
  }

  const alertIdentifier = {
    currentPrice: alert.currentPrice,
    productName: alert.productName,
    productURL: alert.productURL,
  };

  const alertFingerprint = hashCode(JSON.stringify(alertIdentifier));
  TwitterFeedStore.get(alertFingerprint, (error, fingerprint) => {
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
  postStatus,
};
