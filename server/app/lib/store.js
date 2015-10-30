'use strict';

var redis = require('redis'),
	client = redis.createClient(),
	moment = require('moment'),
	logger = require('../../logger').logger,
	_ = require('underscore');

//A redis backed in memory store of recently processed URLs mapped to scraped results
//should expose get and set functionality only keeping all other impl detail internal

//HSET is the data store of choice
//set a TTL for each key to say 15 or 30 mins

var Store = function (options) {
	var defaults = {
		ns: 'productUrl',
		ttlMins: 15
	};

	options = _.extend({}, defaults, options || {});

	this.client = client;
	this.createdAtKey = 'created_at_ts';
	this.ns = options.ns;	//hash set key namespace
	this.ttlMins = options.ttlMins;
};

function getKey(ns, url) {
	return ns + ':' + encodeURIComponent(url);
}

function isDataStale (timestamp, ttl) {
	var diffNow = moment().diff(Math.abs(timestamp), 'minutes');
	return diffNow > ttl;
}

Store.prototype.set = function (url, data) {
	var hsetKey = getKey(this.ns, url);
	for (var key in data) {
		if (data.hasOwnProperty(key)) {
			this.client.hset(hsetKey, key, data[key], function (err, reply) {});
		}
	}

	//associating the time at which we are inserting into redis
	this.client.hset(hsetKey, this.createdAtKey, new Date().getTime());
};

Store.prototype.get = function (url, callback) {
	var hsetKey = getKey(this.ns, url);
	this.client.hgetall(hsetKey, function (err, urlData) {
		if (err) {
			logger.log('error', 'error in hset', {
				hsetKey: hsetKey,
				createdAtKey: this.createdAtKey,
				url: url
			});
			return callback(err);
		}

		if (!urlData) {
			return callback(null, null);
		}

		if (urlData[this.createdAtKey] && !isDataStale(urlData[this.createdAtKey], this.ttlMins)) {
			//if data is not stale
			// TODO not sure why was I doing this removal of createdAtKey. don't see any valid reason to do this
			// TODO remove it if it doesn't wreak havoc
			// remove the internal impl of staleness
			// delete urlData[this.createdAtKey];
			callback(null, urlData);

		} else {
			//if data is stale
			//just del all the keys
			var urlDataKeys = Object.keys(urlData);
			for (var i = 0; i < urlDataKeys.length; i++) {
				this.client.hdel(hsetKey, urlDataKeys[i]);
			}
			callback(null, null);
		}
	}.bind(this));
};

module.exports = {
	Store: Store
};
