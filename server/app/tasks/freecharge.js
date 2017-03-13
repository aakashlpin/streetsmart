

const mongoose = require('mongoose');
const UsersModel = mongoose.model('User');
const Emails = require('../controllers/emails');
const logger = require('../../logger').logger;

exports.sendMail = function (req, res) {
  UsersModel.getAll((err, users) => {
    Emails.sendFeatureMail(users, (err, msg) => {
      if (err) {
        logger.log('error', 'error in sending freecharge email', err);
        return;
      }
      logger.log('info', msg);
    });
  });

  res.json({ status: 'ok' });
};

exports.sendMailer = function (req, res) {
  UsersModel.find({}, { email: 1 }, (err, users) => {
    Emails.sendMailer(users, (err, msg) => {
      if (err) {
        logger.log('error', 'error in sending email', err);
        return;
      }
      logger.log('info', msg);
      res.json({ status: msg });
    });
  });
};
