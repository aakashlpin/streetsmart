'use strict';

var redis = require('redis'),
	client = redis.createClient(),
	moment = require('moment'),
	logger = require('../../logger').logger;

//A redis backed in memory store of recently processed URLs mapped to scraped results
//should expose get and set functionality only keeping all other impl detail internal

//HSET is the data store of choice
//set a TTL for each key to say 15 or 30 mins

var Store = function () {
	this.client = client;
	this.ns = 'productUrl';	//hash set key namespace
	this.createdAtKey = 'created_at_ts';
	this.ttlMins = 15;
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

	//assing the time at which we are inserting into redis
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
			//remove the internal impl of staleness
			delete urlData[this.createdAtKey];
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