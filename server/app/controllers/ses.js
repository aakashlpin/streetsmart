'use strict';
var config = require('../../config/config');
var ses = require('node-ses');
var _ =  require('underscore');
var client = ses.createClient({ key: config.AWS_ACCESS_KEY_ID , secret: config.AWS_SECRET_ACCESS_KEY });
var parseString = require('xml2js').parseString;

module.exports = {
    sendEmail: function (payload, callback) {
        var message = {
            'from': 'Cheapass India <notifications@cheapass.in>',
            'to': payload.to,
            'message': payload.html,
            'subject': payload.subject,
            'replyTo' : 'aakash@cheapass.in'
        };

        if (payload.bcc) {
            _.extend(message, {
                'bcc': payload.bcc
            });
        }

        if (payload.from) {
            _.extend(message, {
                'from': payload.from
            });
        }

        client.sendemail(message, function(err, response) {
            if (err) {
                callback(err);
            } else {
                parseString(response, function (err, result) {
                    if (err) {
                        callback('done');
                    } else {
                        var messageId;
                        try {
                            messageId = result.SendEmailResponse.SendEmailResult[0].MessageId[0];
                        } catch (e) {
                            messageId = 'done';
                        } finally {
                            callback(null, messageId);
                        }
                    }
                });
            }
        });
    }
};