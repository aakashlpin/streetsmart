'use strict';

var path       = require('path'),
async          = require('async'),
templatesDir   = path.resolve(__dirname, '..', 'templates'),
emailTemplates = require('email-templates'),
_              = require('underscore'),
config         = require('../../config/config');

var emailService = config.emailService;
var env = process.env.NODE_ENV || 'development';
var server = config.server[env];

function sendEmail(payload, callback) {
    //ESP Throttling happening for hotmail and yahoo emails
    if (_.find(['@hotmail.', '@live.', '@ymail.', '@yahoo.'], function (provider) {
        return payload.to.indexOf(provider) > 0;
    })) {
        require('./ses').sendEmail(payload, callback);
        return;
    }

    require('./' + emailService).sendEmail(payload, callback);
}

module.exports = {
    sendVerifier: function(user, product, callback) {
        emailTemplates(templatesDir, function(err, template) {
            if (err) {
                callback(err);

            } else {
                if (!user.email || (user.email && !user.email.length)) {
                    return callback('Recipient not found');
                }

                var encodedEmail = encodeURIComponent(user.email);
                if (product.seller) {
                    //human readable seller name
                    product.seller = config.sellers[product.seller].name;
                }

                var locals = {
                    user: user,
                    product: product,
                    verificationLink: server + '/verify?' + 'email=' + encodedEmail
                };

                template('verifier', locals, function(err, html) {
                    if (err) {
                        callback(err);
                    } else {
                        sendEmail({
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
                    server: server
                };

                _.extend(locals.user, {
                    dashboardURL: (server + '/dashboard/' + user._id)
                });

                // Send a single email
                template('notifier', locals, function(err, html) {
                    if (err) {
                        callback(err);
                    } else {
                        sendEmail({
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
                    dashboardURL: (server + '/dashboard/' + user._id),
                    dashboardProductURL: (server + '/dashboard/' + user._id + '?productId=' + product._id)
                });

                template('handshake', locals, function(err, html) {
                    if (err) {
                        callback(err);
                    } else {
                        sendEmail({
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
                    verificationLink: server + '/verify?' + 'email=' + encodedEmail
                };

                template('reverifier', locals, function(err, html) {
                    if (err) {
                        callback(err);
                    } else {
                        sendEmail({
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
                    verificationLink: server + '/verify?' + 'email=' + encodedEmail
                };

                template('reminder', locals, function(err, html) {
                    if (err) {
                        callback(err);
                    } else {
                        sendEmail({
                            'subject': 'Cheapass | What happened?',
                            'html': html,
                            'to': locals.user.email,
                            'from': 'Aakash Goel <aakash@cheapass.in>'
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
                        sendEmail({
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
                    template('anniversary', user, function(err, html) {
                        if (err) {
                            asyncEachCb(err);

                        } else {
                            sendEmail({
                                'subject': 'Cheapass Turns One! A Small Thank You Note. :)',
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
