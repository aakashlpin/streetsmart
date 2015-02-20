'use strict';
var config = require('../../config/config');
var request = require('request');
var logger = require('../../logger').logger;

var fullContactAPIKeys = config.fullContactAPIKeys;

function getRequestUri(email) {
    return ('https://api.fullcontact.com/v2/person.json?email=' + email + '&apiKey=' + fullContactAPIKeys[0]);
}

module.exports = {
    get: function (email, callback) {
        request.get({url: getRequestUri(email), json: true}, function (e, r, user) {
            if (e) {
                logger.log('error', 'fullcontact for email ', + email, e);
                return callback(e, null);
            }
            logger.log('info', 'fullcontact for email ' + email, user);
            if (r.statusCode === 200) {
                callback(null, user);
            } else {
                callback(r.statusCode, null);
            }
        });
    }
};