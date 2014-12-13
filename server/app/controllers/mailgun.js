'use strict';
var config = require('../../config/config');
var _ =  require('underscore');
var domain = 'mg.cheapass.in';
var mailgun = require('mailgun-js')({ apiKey: config.mailgunAPIKey, domain: domain });
var MailComposer = require('mailcomposer').MailComposer;
var mailcomposer = new MailComposer();

module.exports = {
    sendEmail: function (payload, callback) {
        var message = {
            'from': payload.from || 'Cheapass India <notifications@mg.cheapass.in>',
            'to': payload.to,
            'html': payload.html,
            'subject': payload.subject,
            'h:Reply-To': 'aakash@cheapass.in'
        };

        if (payload.bcc) {
            message.bcc = payload.bcc;
        }

        mailcomposer.setMessageOption(message);
        mailcomposer.buildMessage(function(mailBuildError, messageSource) {
            var dataToSend = {
                to: payload.to,
                message: messageSource,
                'h:Reply-To': 'aakash@cheapass.in'
            };

            if (payload.bcc) {
                dataToSend.to = (payload.to + ',' + payload.bcc);
            }

            mailgun.messages().sendMime(dataToSend, function (err, responseStatus) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, responseStatus);
                }
            });
        });
    }
};