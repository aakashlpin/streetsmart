// TODO this is broken now.


const config = require('../../config/config');
const mailcomposer = require('mailcomposer');
const domain = !process.env.IS_DEV ? 'cheapass.in' : 'sandboxa85e8ce51a1d442bb8182d7364f8f761.mailgun.org';
const mailgun = require('mailgun-js')({ apiKey: process.env.MAILGUN_API_KEY, domain });

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
        message: messageSource,
        'h:Reply-To': 'aakash@cheapass.in',
      };

      if (payload.bcc) {
                // dataToSend.to = (payload.to + ',' + payload.bcc);
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
};
