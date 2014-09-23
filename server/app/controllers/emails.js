'use strict';

var path       = require('path'),
templatesDir   = path.resolve(__dirname, '..', 'templates'),
emailTemplates = require('email-templates'),
_              = require('underscore'),
config         = require('../../config/config');

var postmark = require('postmark')(config.postmarkAPIKey);

module.exports = {
    sendVerifier: function(user, product, callback) {
        emailTemplates(templatesDir, function(err, template) {
            if (err) {
                callback(err);

            } else {
                var encodedEmail = encodeURIComponent(user.email);
                var locals = {
                    user: user,
                    product: product,
                    verificationLink: config.server + '/verify?' + 'email=' + encodedEmail
                };

                template('verifier', locals, function(err, html) {
                    if (err) {
                        callback(err);
                    } else {
                        postmark.send({
                            'From': 'Cheapass India <notifications@cheapass.in>',
                            'To': locals.user.email,
                            'Bcc': 'aakash@cheapass.in',
                            'ReplyTo' : 'aakash@cheapass.in',
                            'HtmlBody': html,
                            'Subject': 'Confirm email to receive price change notifications'
                        }, function(err, responseStatus) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, responseStatus);
                            }
                        });
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
                var locals = {
                    user: user,
                    product: product,
                    server: config.server
                };

                var encodedEmail = encodeURIComponent(product.email);
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
                        postmark.send({
                            'From': 'Cheapass India <notifications@cheapass.in>',
                            'To': locals.user.email,
                            'ReplyTo' : 'aakash@cheapass.in',
                            'HtmlBody': html,
                            'Subject': 'Price change notification for ' + locals.product.productName,
                        }, function(err, responseStatus) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, responseStatus);
                            }
                        });
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
                        postmark.send({
                            'From': 'Cheapass India <notifications@cheapass.in>',
                            'To': locals.user.email,
                            // 'Bcc': 'aakash@cheapass.in',
                            'ReplyTo' : 'aakash@cheapass.in',
                            'HtmlBody': html,
                            'Subject': 'Price Track added for ' + locals.product.productName
                        }, function(err, responseStatus) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, responseStatus);
                            }
                        });
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
                        postmark.send({
                            'From': 'Cheapass India <notifications@cheapass.in>',
                            'To': locals.email,
                            'Bcc': 'aakash@cheapass.in',
                            'ReplyTo' : 'aakash@cheapass.in',
                            'HtmlBody': html,
                            'Subject': 'Device verification code'
                        }, function(err, responseStatus) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, responseStatus);
                            }
                        });
                    }
                });
            }
        });
    },
    sendFeatureMail: function(users, callback) {
        //pass to this method an array of user emails
        emailTemplates(templatesDir, function(err, template) {
            if (err) {
                callback(err);

            } else {
                template('freecharge', users, function(err, html) {
                    if (err) {
                        callback(err);
                    } else {
                        users.forEach(function(user) {
                            postmark.send({
                                'From': 'Cheapass India <notifications@cheapass.in>',
                                'To': user.email,
                                'Bcc': 'aakash@cheapass.in',
                                'ReplyTo' : 'aakash@cheapass.in',
                                'HtmlBody': html,
                                'Subject': 'Track and earn!'
                            }, function(err, responseStatus) {
                                if (err) {
                                    console.log('error', err);
                                } else {
                                    console.log('sent', responseStatus);
                                }
                            });
                        });
                    }
                });

                callback(null, 'emails queued');
            }
        });
    }
};
