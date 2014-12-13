'use strict';

var path       = require('path'),
async          = require('async'),
templatesDir   = path.resolve(__dirname, '..', 'templates'),
emailTemplates = require('email-templates'),
_              = require('underscore'),
config         = require('../../config/config');

var emailService = config.emailService;

function sendEmail(payload, callback) {
    require('./' + emailService).sendEmail(payload, callback);
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
                    dashboardURL: (config.server + '/dashboard?email=' + encodeURIComponent(user.email))
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
                    verificationLink: config.server + '/verify?' + 'email=' + encodedEmail
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
                    verificationLink: config.server + '/verify?' + 'email=' + encodedEmail
                };

                template('reminder', locals, function(err, html) {
                    if (err) {
                        callback(err);
                    } else {
                        sendEmail({
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
                    template('dashboard', user, function(err, html) {
                        if (err) {
                            asyncEachCb(err);

                        } else {
                            sendEmail({
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
