const domain = 'cheapass.in';
const apiKey = process.env.MAILGUN_API_KEY;

const mailgun = require('mailgun-js')({ apiKey, domain });
const mailcomposer = require('mailcomposer');
const async = require('async');
const logger = require('../../logger').logger;
const chunkify = require('../lib/chunkify');

module.exports = {
  sendEmail(payload, callback) {
    const message = {
      from: payload.from || (`Cheapass India <notifications@${domain}>`),
      to: payload.to,
      html: payload.html,
      subject: payload.subject,
      'h:Reply-To': 'aakash@cheapass.in',
    };

    if (payload.bcc) {
      message.bcc = payload.bcc;
    }

    const mail = mailcomposer(message);

    mail.build((mailBuildError, messageSource) => {
      const dataToSend = {
        to: payload.to,
        message: messageSource.toString('ascii'),
        'h:Reply-To': 'aakash@cheapass.in',
      };

      if (payload.bcc) {
        dataToSend.to = `${payload.to},${payload.bcc}`;
      }

      mailgun.messages().sendMime(dataToSend, (err, responseStatus) => {
        if (err) {
          callback(err);
        } else {
          callback(null, responseStatus);
        }
      });
    });
  },
  addUsersToProductUpdatesMailingList(users, listEmailId, callback) {
    /**
    users - ['aakash.lpin@gmail.com', 'aakash@cheapass.in'...]
    **/

    const members = users.map(email => ({
      address: email,
    }));

    const callsRequired = Math.ceil(members.length / 1000);
    const batches = chunkify(members, callsRequired, true);

    const q = async.queue((doc, qcb) => {
      const { emails } = doc;

      mailgun
      .lists(listEmailId)
      .members()
      .add({ members: emails, subscribed: true }, (err, body) => {
        if (err) {
          logger.log('error', `error subscribing to mailing list ${listEmailId}`, err);
          return qcb(err);
        }

        logger.log(`response from subscribing users to mailing list ${listEmailId}`, body);
        return qcb(null);
      });
    });

    q.drain = () => {
      callback(null, {
        status: 'ok'
      });
    };

    batches.forEach(batch => q.push({ emails: batch }));
  }

};
