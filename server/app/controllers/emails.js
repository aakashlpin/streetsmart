const path = require('path');
const async = require('async');
const emailTemplates = require('email-templates');
const _ = require('underscore');
const config = require('../../config/config');
const logger = require('../../logger').logger;
const ses = require('./ses');
const mailgun = require('./mailgun');

const templatesDir = path.resolve(__dirname, '..', 'templates');
const server = process.env.SERVER;
const emailService = process.env.EMAIL_SERVICE;

function sendEmail(payload, callback) {
  if (process.env.IS_DEV && process.env.ADMIN_EMAIL_IDS.indexOf(payload.to) === -1) {
    return;
  }

  switch (payload.provider) {
    case 'mailgun':
      return mailgun.sendEmail(payload, callback);
    case 'ses':
      return ses.sendEmail(payload, callback);
    default:
      switch (emailService) {
        case 'mailgun':
          return mailgun.sendEmail(payload, callback);
        case 'ses':
        default:
          return ses.sendEmail(payload, callback);
      }
  }
}

module.exports = {
  sendVerifier(user, product, callback) {
    emailTemplates(templatesDir, (err, template) => {
      if (err) {
        callback(err);
      } else {
        if (!user.email || (user.email && !user.email.length)) {
          return callback('Recipient not found');
        }

        const encodedEmail = encodeURIComponent(user.email);
        if (product.seller) {
          // human readable seller name
          product.seller = config.sellers[product.seller].name;
        }

        const locals = {
          user,
          product,
          verificationLink: `${server}/verify?email=${encodedEmail}`,
        };

        template('verifier', locals, (err, html) => {
          if (err) {
            callback(err);
          } else {
            sendEmail({
              subject: 'Cheapass | Verify your email id',
              html,
              bcc: 'aakash@cheapass.in',
              to: locals.user.email,
            }, callback);
          }
        });
      }
    });
  },
  sendNotifier(user, product, callback) {
    emailTemplates(templatesDir, (err, template) => {
      if (err) {
        callback(err);
      } else {
        if (product.seller) {
          // human readable seller name
          product.seller = config.sellers[product.seller].name;
        }

        const locals = {
          user,
          product,
          server,
        };

        _.extend(locals.user, {
          dashboardURL: (`${server}/dashboard/${user._id}`),
        });

                // Send a single email
        template('notifier', locals, (err, html) => {
          if (err) {
            callback(err);
          } else {
            sendEmail({
              subject: `Price Drop Alert | ${locals.product.seller} | ${locals.product.productName}`,
              html,
              to: locals.user.email,
            }, callback);
          }
        });
      }
    });
  },
  sendHandshake(user, product, callback) {
    emailTemplates(templatesDir, (err, template) => {
      if (err) {
        callback(err);
      } else {
        if (product.seller) {
          // human readable seller name
          product.seller = config.sellers[product.seller].name;
        }

        const locals = {
          user,
          product,
        };

        _.extend(locals.user, {
          dashboardURL: (`${server}/dashboard/${user._id}`),
          dashboardProductURL: (`${server}/dashboard/${user._id}?productId=${product._id}`),
        });

        template('handshake', locals, (err, html) => {
          if (err) {
            callback(err);
          } else {
            sendEmail({
              subject: `Price Alert Set | ${locals.product.seller} | ${locals.product.productName}`,
              html,
              to: locals.user.email,
            }, callback);
          }
        });
      }
    });
  },
  resendVerifierEmail(user, callback) {
    emailTemplates(templatesDir, (err, template) => {
      if (err) {
        callback(err);
      } else {
        const encodedEmail = encodeURIComponent(user.email);
        const locals = {
          user,
          verificationLink: `${server}/verify?email=${encodedEmail}`,
        };

        template('reverifier', locals, (err, html) => {
          if (err) {
            callback(err);
          } else {
            sendEmail({
              subject: 'Cheapass | Verify your email id',
              html,
              to: locals.user.email,
            }, callback);
          }
        });
      }
    });
  },
  sendReminderEmail(user, callback) {
    emailTemplates(templatesDir, (err, template) => {
      if (err) {
        callback(err);
      } else {
        const encodedEmail = encodeURIComponent(user.email);
        const locals = {
          user,
          verificationLink: `${server}/verify?email=${encodedEmail}`,
        };

        template('reminder', locals, (err, html) => {
          if (err) {
            callback(err);
          } else {
            sendEmail({
              subject: 'Cheapass | What happened?',
              html,
              to: locals.user.email,
              from: 'Aakash Goel <aakash@cheapass.in>',
            }, callback);
          }
        });
      }
    });
  },
  sendDeviceVerificationCode(registrationData, callback) {
    emailTemplates(templatesDir, (err, template) => {
      if (err) {
        callback(err);
      } else {
        const locals = registrationData;

        template('deviceregistration', locals, (err, html) => {
          if (err) {
            callback(err);
          } else {
            sendEmail({
              subject: `Cheapass | App Login OTP | ${locals.verificationCode}`,
              html,
              to: locals.email,
              bcc: 'aakash@cheapass.in',
            }, callback);
          }
        });
      }
    });
  },
  sendMailer(users, callback) {
        // pass to this method an array of user emails
    emailTemplates(templatesDir, (err, template) => {
      if (err) {
        callback(err);
      } else {
        async.eachLimit(users, 500, (user, asyncEachCb) => {
          template('android_app', user, (err, html) => {
            if (err) {
              asyncEachCb(err);
            } else {
              sendEmail({
                subject: '💥🎉🎊Launching Cheapass Android App 🎂✨💞',
                html,
                to: user.email,
                provider: 'mailgun',
              }, asyncEachCb);
            }
          });
        }, () => {
          callback(null, 'emails sent');
        });
      }
    });
  },
  sendAmazonSalesReport(imagesPathnames, callback) {
    emailTemplates(templatesDir, (err, template) => {
      if (err) {
        callback(err);
      } else {
        const locals = {
          images: imagesPathnames,
          email: 'aakash.lpin@gmail.com',
        };

        template('amazon-report', locals, (err, html) => {
          if (err) {
            callback(err);
          } else {
            sendEmail({
              subject: 'Cheapass | Amazon Earnings',
              html,
              to: locals.email,
            }, callback);
          }
        });
      }
    });
  },
  sendAlertsSuspensionNotifier(userAlerts, callback) {
    emailTemplates(templatesDir, (err, template) => {
      if (err) {
        callback(err);
      } else {
        const emails = Object.keys(userAlerts);
        async.eachLimit(emails, 2, (email, asyncOneCb) => {
          const locals = {
            email,
            baseUrl: process.env.SERVER,
            alerts: userAlerts[email],
          };

          template('suspension', locals, (err, html) => {
            if (err) {
              callback(err);
            } else {
              sendEmail({
                subject: '[IMPORTANT] Cheapass | Old Alerts Suspension',
                html,
                to: email,
              }, () => {
                logger.log('info', `[sendAlertsSuspensionNotifier] send email to ${email}`);
              });
            }
            asyncOneCb(err);
          });
        }, (err) => {
          if (err) {
            logger.log('error', `[sendAlertsSuspensionNotifier] failed with ${err}`);
          } else {
            logger.log('info', '[sendAlertsSuspensionNotifier] successfully executed');
          }
        });
      }
    });
  },
  sendEmailThatTheURLCannotBeAdded({ email, productURL, seller }, callback) {
    emailTemplates(templatesDir, (err, template) => {
      if (err) {
        return callback(err);
      }

      const locals = {
        email,
        productURL,
        seller,
      };

      template('unaddable', locals, (err, html) => {
        if (err) {
          callback(err);
        } else {
          sendEmail({
            subject: 'Cheapass India | Unable to set the price drop alert',
            html,
            to: email,
            bcc: 'aakash@cheapass.in',
          }, () => {
            logger.log('info', `[sendEmailThatTheURLCannotBeAdded] send email to ${email}`);
            return callback(null);
          });
        }
      });
    });
  },
  sendEmailAboutFlipkartSupport(callback) {
    emailTemplates(templatesDir, (err, template) => {
      if (err) {
        return callback(err);
      }

      template('flipkart-support', {}, (err, html) => {
        if (err) {
          callback(err);
        } else {
          sendEmail({
            subject: 'Cheapass India | Testing | Product Updates March',
            html,
            to: 'updates-local@cheapass.in',
          }, () => {
            logger.log('info', '[sendEmailAboutFlipkartSupport] send email to updates-local@cheapass.in');
            return callback(null);
          });
        }
      });
    });
  },
};
