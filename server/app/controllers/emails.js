'use strict';

var path       = require('path'),
async          = require('async'),
templatesDir   = path.resolve(__dirname, '..', 'templates'),
emailTemplates = require('email-templates'),
_              = require('underscore'),
config         = require('../../config/config');

var postmark = require('postmark')(config.postmarkAPIKey);
var mandrill = require('mandrill-api/mandrill');
var mandrillClient = new mandrill.Mandrill(config.mandrillAPIKey);

var emailService = config.emailService;

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

function sendEmail(service, payload, callback) {
    var message;
    if (service === 'postmark') {
        message = {
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

    } else if (service === 'mandrill') {
        message = _.extend({
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
}

module.exports = {
    sendVerifier: function(user, product, callback) {
        emailTemplates(templatesDir, function(err, template) {
            if (err) {
                callback(err);

            } else {
                var encodedEmail = encodeURIComponent(user.email);
                if (product.seller) {
                    //human readable seller name
                    product.seller = config.sellers[product.seller].name;
                }

                var locals = {
                    user: user,
                    product: product,
                    verificationLink: config.server + '/verify?' + 'email=' + encodedEmail
                };

                template('verifier', locals, function(err, html) {
                    if (err) {
                        callback(err);
                    } else {
                        sendEmail(emailService, {
                            'subject': 'Cheapass | Verify your email id',
                            'html': html,
                            'bcc': 'aakash@cheapass.in',
                            'to': locals.user.email
                        }, callback);
                    }
                });
            }
        });

    },
    sendNotifier: function(user, product, callback) {
        emailTemplates(templatesDir, function(err, template) {
            if (err) {
                callback(err);

            } else {
                if (product.seller) {
                    //human readable seller name
                    product.seller = config.sellers[product.seller].name;
                }

                var locals = {
                    user: user,
                    product: product,
                    server: config.server
                };

                // var encodedEmail = encodeURIComponent(product.email);
                var encodedURL = encodeURIComponent(product.productURL);
                // var baseUnsubscribeLink = config.server + '/unsubscribe?email=' + encodedEmail;

                _.extend(locals.user, {
                    dashboardURL: (config.server + '/dashboard?email=' + encodeURIComponent(user.email))
                });

                _.extend(locals.product, {
                    selfProductRedirectURL: config.server + '/redirect?url=' + encodedURL
                });

                // Send a single email
                template('notifier', locals, function(err, html) {
                    if (err) {
                        callback(err);
                    } else {
                        sendEmail(emailService, {
                            'subject': 'Price Drop Alert | ' + locals.product.seller + ' | ' + locals.product.productName,
                            'html': html,
                            'to': locals.user.email
                        }, callback);
                    }
                });
            }
        });
    },
    sendHandshake: function(user, product, callback) {
        emailTemplates(templatesDir, function(err, template) {
            if (err) {
                callback(err);

            } else {
                if (product.seller) {
                    //human readable seller name
                    product.seller = config.sellers[product.seller].name;
                }

                var locals = {
                    user: user,
                    product: product
                };

                _.extend(locals.user, {
                    dashboardURL: (config.server + '/dashboard?email=' + encodeURIComponent(user.email))
                });

                template('handshake', locals, function(err, html) {
                    if (err) {
                        callback(err);
                    } else {
                        sendEmail(emailService, {
                            'subject': 'Price Alert Set | ' + locals.product.seller + ' | ' + locals.product.productName,
                            'html': html,
                            'to': locals.user.email
                        }, callback);
                    }
                });
            }
        });
    },
    resendVerifierEmail: function (user, callback) {
        emailTemplates(templatesDir, function(err, template) {
            if (err) {
                callback(err);

            } else {
                var encodedEmail = encodeURIComponent(user.email);
                var locals = {
                    user: user,
                    verificationLink: config.server + '/verify?' + 'email=' + encodedEmail
                };

                template('reverifier', locals, function(err, html) {
                    if (err) {
                        callback(err);
                    } else {
                        sendEmail(emailService, {
                            'subject': 'Cheapass | Verify your email id',
                            'html': html,
                            'to': locals.user.email
                        }, callback);
                    }
                });
            }
        });
    },
    sendReminderEmail: function (user, callback) {
        emailTemplates(templatesDir, function(err, template) {
            if (err) {
                callback(err);

            } else {
                var encodedEmail = encodeURIComponent(user.email);
                var locals = {
                    user: user,
                    verificationLink: config.server + '/verify?' + 'email=' + encodedEmail
                };

                template('reminder', locals, function(err, html) {
                    if (err) {
                        callback(err);
                    } else {
                        sendEmail(emailService, {
                            'subject': 'Cheapass | What happened.. ???',
                            'html': html,
                            'to': locals.user.email,
                            'from': 'aakash@cheapass.in'
                        }, callback);
                    }
                });
            }
        });
    },
    sendDeviceVerificationCode: function(registrationData, callback) {
        emailTemplates(templatesDir, function(err, template) {
            if (err) {
                callback(err);

            } else {
                var locals = registrationData;

                template('deviceregistration', locals, function(err, html) {
                    if (err) {
                        callback(err);
                    } else {
                        sendEmail(emailService, {
                            'subject': 'Cheapass | Device verification code',
                            'html': html,
                            'to': locals.email,
                            'bcc': 'aakash@cheapass.in'
                        }, callback);
                    }
                });
            }
        });
    },
    sendMailer: function(users, callback) {
        //pass to this method an array of user emails
        emailTemplates(templatesDir, function(err, template) {
            if (err) {
                callback(err);

            } else {
                async.each(users, function(user, asyncEachCb){
                    template('dashboard', user, function(err, html) {
                        if (err) {
                            asyncEachCb(err);

                        } else {
                            sendEmail(emailService, {
                                'subject': 'Introducing Your Personal Dashboard!',
                                'html': html,
                                'to': user.email
                            }, asyncEachCb);
                        }
                    });

                }, function() {
                    callback(null, 'emails sent');
                });
            }
        });
    }
};
