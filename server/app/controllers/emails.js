const path = require('path');
const async = require('async');
const emailTemplates = require('email-templates');
const _ = require('underscore');
const config = require('../../config/config');
const logger = require('../../logger').logger;
const ses = require('./ses');
const mailgun = require('./mailgun');
const ejs = require('ejs');
const fs = require('fs');

const templatesDir = path.resolve(__dirname, '..', 'templates');
const promoEmailsDir = path.resolve(__dirname, '..', '..', 'emails', 'promotional', 'dist');
const server = process.env.SERVER;
const emailService = process.env.EMAIL_SERVICE;

function sendEmail(payload, callback) {
  if (process.env.IS_DEV) {
    const matchesWhitelist = process.env.ADMIN_EMAIL_IDS.indexOf(payload.to) > -1;
    // const isCheapassDomain = payload.to.indexOf('@cheapass.in') > 0;
    if (!matchesWhitelist) return;
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
        _.extend(product, {
          seller: config.sellers[product.seller].name,
        });

        const locals = {
          user,
          product,
          verificationLink: `${server}/verify/${user._id}`,
        };

        template('verifier', locals, (err, html) => {
          if (err) {
            callback(err);
          } else {
            sendEmail({
              subject: '[IMPORTANT] Verify email id to continue...',
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
          _.extend(product, {
            seller: config.sellers[product.seller].name,
          });
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
              subject: `[PRICE DROP ALERT] ${locals.product.seller} - ${locals.product.productName}`,
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
          _.extend(product, {
            seller: config.sellers[product.seller].name,
          });
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
              subject: `[ALERT SUCCESS] ${locals.product.seller} - ${locals.product.productName}`,
              html,
              to: locals.user.email,
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
              subject: `[App Login OTP] ${locals.verificationCode}`,
              html,
              to: locals.email,
              bcc: 'aakash@cheapass.in',
            }, callback);
          }
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
            subject: '[Cheapass India] Unable to set the price drop alert',
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
  sendSurveyPromoEmail(callback) {
    const file = fs.readFileSync(`${promoEmailsDir}/promo-survey.html`, {
      encoding: 'utf-8'
    });

    const html = ejs.render(file, {
      SERVER: process.env.SERVER,
    });

    const to = process.env.IS_DEV ? 'local-test@cheapass.in' : 'updates@cheapass.in';

    sendEmail({
      subject: '[Cheapass.in] Hello! We really need your help with a few questions.',
      html,
      to,
    }, () => {
      logger.log('info', `[sendSurveyPromoEmail] send email to ${to}`);
      return callback(null);
    });
  },
};
