const redis = require('redis');
const moment = require('moment');
const logger = require('../../logger').logger;
const _ = require('underscore');

const client = redis.createClient();
// A redis backed in memory store of recently processed URLs mapped to scraped results
// should expose get and set functionality only keeping all other impl detail internal

// HSET is the data store of choice
// set a TTL for each key to say 15 or 30 mins

const Store = function (options) {
  const defaults = {
    ns: 'productUrl',
    ttlMins: 15,
  };

  options = _.extend({}, defaults, options || {});

  this.client = client;
  this.createdAtKey = 'created_at_ts';
  this.ns = options.ns; // hash set key namespace
  this.ttlMins = options.ttlMins;
};

function getKey(ns, url) {
  return `${ns}:${encodeURIComponent(url)}`;
}

function isDataStale(timestamp, ttl) {
  const diffNow = moment().diff(Math.abs(timestamp), 'minutes');
  return diffNow > ttl;
}

Store.prototype.set = function (url, data) {
  const hsetKey = getKey(this.ns, url);
  Object.keys(data).forEach((key) => {
    this.client.hset(hsetKey, key, data[key], function (err, reply) {});
  });
  // associating the time at which we are inserting into redis
  this.client.hset(hsetKey, this.createdAtKey, new Date().getTime());
};

Store.prototype.get = function (url, callback) {
  const hsetKey = getKey(this.ns, url);
  this.client.hgetall(hsetKey, (err, urlData) => {
    if (err) {
      logger.log('error', 'error in hset', {
        hsetKey,
        createdAtKey: this.createdAtKey,
        url,
      });
      return callback(err);
    }

    if (!urlData) {
      return callback(null, null);
    }

    if (urlData[this.createdAtKey] && !isDataStale(urlData[this.createdAtKey], this.ttlMins)) {
      callback(null, urlData);
    } else {
      // if data is stale
      // just del all the keys
      const urlDataKeys = Object.keys(urlData);
      for (let i = 0; i < urlDataKeys.length; i++) {
        this.client.hdel(hsetKey, urlDataKeys[i]);
      }
      callback(null, null);
    }
  });
};

module.exports = {
  Store,
};
