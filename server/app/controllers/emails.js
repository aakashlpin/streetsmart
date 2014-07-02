'use strict';

var path       = require('path'),
templatesDir   = path.resolve(__dirname, '..', 'templates'),
emailTemplates = require('email-templates'),
// nodemailer     = require('nodemailer'),
_              = require('underscore'),
config         = require('../../config/config');

var postmark = require('postmark')(config.postmarkAPIKey);

// Prepare nodemailer transport object
// var transport = nodemailer.createTransport('postmark');

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
                            from: 'Cheapass India <notifications@cheapass.in>',
                            to: locals.user.email,
                            subject: 'Confirm email to receive price change notifications',
                            html: html
                        }, function(err, responseStatus) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, responseStatus.message);
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
                var baseUnsubscribeLink = config.server + '/unsubscribe?email=' + encodedEmail;
                _.extend(locals.product, {
                    productUnsubscribeLink: baseUnsubscribeLink + '&productURL=' + encodedURL,
                    allUnsubscribeLink: baseUnsubscribeLink,
                    selfProductRedirectURL: config.server + '/redirect?url=' + encodedURL
                });

                // Send a single email
                template('notifier', locals, function(err, html) {
                    if (err) {
                        callback(err);
                    } else {
                        postmark.send({
                            from: 'Cheapass India <notifications@cheapass.in>',
                            to: locals.user.email,
                            subject: 'Price change notification for ' + locals.product.productName,
                            html: html
                        }, function(err, responseStatus) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, responseStatus.message);
                            }
                        });
                    }
                });
            }
        });
    }
};
