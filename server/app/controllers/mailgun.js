'use strict';
var config = require('../../config/config');
var MailComposer = require('mailcomposer').MailComposer;
var env = process.env.NODE_ENV || 'development';
var domain = env === 'production' ? 'cheapass.in' : 'sandboxa85e8ce51a1d442bb8182d7364f8f761.mailgun.org';
var mailgun = require('mailgun-js')({ apiKey: config.mailgunAPIKey, domain: domain });

module.exports = {
    sendEmail: function (payload, callback) {
        var mailcomposer = new MailComposer();
        var message = {
            'from': payload.from || ('Cheapass India <notifications@'+ domain +'>'),
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