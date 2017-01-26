'use strict';

var path       = require('path'),
async          = require('async'),
templatesDir   = path.resolve(__dirname, '..', 'templates'),
emailTemplates = require('email-templates'),
_              = require('underscore'),
config         = require('../../config/config'),
logger 		   = require('../../logger').logger;

var emailService = config.emailService;
var env = process.env.NODE_ENV || 'development';
var server = config.server[env];
var ses = require('./ses');
var mandrill = require('./mandrill');
var mailgun = require('./mailgun');

function sendEmail(payload, callback) {
    //ESP Throttling happening for hotmail and yahoo emails
    if (_.find(['@hotmail.', '@live.', '@ymail.', '@yahoo.'], function (provider) {
        return payload.to.indexOf(provider) > 0;
    })) {
        ses.sendEmail(payload, callback);
        return;
    }

    if (payload.provider && payload.provider === 'mandrill') {
      mandrill.sendEmail(payload, callback);
    }
    else if (payload.provider && payload.provider === 'mailgun') {
      mailgun.sendEmail(payload, callback);
    }
    else {
      ses.sendEmail(payload, callback);
    }
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
                            'subject': 'Cheapass | App Login OTP | ' + locals.verificationCode,
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
                async.eachLimit(users, 500, function(user, asyncEachCb){
                    template('android_app', user, function(err, html) {
                        if (err) {
                            asyncEachCb(err);

                        } else {
                            sendEmail({
                                'subject': '💥🎉🎊Launching Cheapass Android App 🎂✨💞',
                                'html': html,
                                'to': user.email,
                                'provider': 'mailgun'
                            }, asyncEachCb);
                        }
                    });

                }, function() {
                    callback(null, 'emails sent');
                });
            }
        });
    },
    sendDailyReport: function(alerts, callback) {
        emailTemplates(templatesDir, function(err, template) {
            if (err) {
                callback(err);

            } else {
                var locals = {
                	alerts: alerts,
                	email: 'pisceanaish@gmail.com'
                };

                template('report', locals, function(err, html) {
                    if (err) {
                        callback(err);
                    } else {
                        sendEmail({
                            'subject': 'Cheapass - Pucchis Due Report',
                            'html': html,
                            'to': locals.email,
                            'cc': 'aakash@cheapass.in'
                        }, callback);
                    }
                });
            }
        });
    },
    sendAmazonSalesReport: function (imagesPathnames, callback) {
      emailTemplates(templatesDir, function(err, template) {
          if (err) {
              callback(err);

          } else {
              var locals = {
                images: imagesPathnames,
                email: 'aakash.lpin@gmail.com'
              };

              template('amazon-report', locals, function(err, html) {
                  if (err) {
                      callback(err);
                  } else {
                      sendEmail({
                          'subject': 'Cheapass | Amazon Earnings',
                          'html': html,
                          'to': locals.email,
                      }, callback);
                  }
              });
          }
      });
    }

};
