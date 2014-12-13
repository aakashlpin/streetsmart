'use strict';
var config = require('../../config/config');
var mandrill = require('mandrill-api/mandrill');
var mandrillClient = new mandrill.Mandrill(config.mandrillAPIKey);
var _ =  require('underscore');

var defaultMandrillOptions = {
    'from_email': 'notifications@cheapass.in',
    'from_name': 'Cheapass India',
    'headers': {
        'Reply-To': 'aakash@cheapass.in'
    },
    'important': true,
    'track_opens': true,
    'track_clicks': true,
    'auto_text': true,
    'auto_html': false,
    'inline_css': true,
    'url_strip_qs': true,
    'preserve_recipients': true,
    'view_content_link': false,
    'merge': false
};

module.exports = {
    sendEmail: function (payload, callback) {
        var message = _.extend({
            'html': payload.html,
            'subject': payload.subject,
            'to': [
                {
                    'email': payload.to,
                    'type': 'to'
                }
            ]
        }, defaultMandrillOptions);

        if (payload.bcc) {
            _.extend(message, {
                'bcc_address': payload.bcc
            });
        }

        if (payload.from) {
            _.extend(message, {
                'from_email': payload.from
            });
        }

        mandrillClient.messages.send({
            'message': message
        }, function(result) {
            callback(null, result);
        }, function(e) {
            callback(e);
        });
    }
};