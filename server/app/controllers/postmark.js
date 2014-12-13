'use strict';
var config = require('../../config/config');
var postmark = require('postmark')(config.postmarkAPIKey);
var _ =  require('underscore');

module.exports = {
    sendEmail: function (payload, callback) {
        var message = {
            'From': 'Cheapass India <notifications@cheapass.in>',
            'To': payload.to,
            'HtmlBody': payload.html,
            'Subject': payload.subject,
            'ReplyTo' : 'aakash@cheapass.in'
        };

        if (payload.bcc) {
            _.extend(message, {
                'Bcc': payload.bcc
            });
        }

        if (payload.from) {
            _.extend(message, {
                'From': payload.from
            });
        }

        postmark.send(message, function(err, responseStatus) {
            if (err) {
                callback(err);
            } else {
                callback(null, responseStatus);
            }
        });
    }
};