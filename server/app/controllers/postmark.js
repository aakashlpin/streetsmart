const postmark = require('postmark')(process.env.POSTMARK_API_KEY);
const _ = require('underscore');

module.exports = {
  sendEmail(payload, callback) {
    const message = {
      From: 'Cheapass India <notifications@cheapass.in>',
      To: payload.to,
      HtmlBody: payload.html,
      Subject: payload.subject,
      ReplyTo: 'aakash@cheapass.in',
    };

    if (payload.bcc) {
      _.extend(message, {
        Bcc: payload.bcc,
      });
    }

    if (payload.from) {
      _.extend(message, {
        From: payload.from,
      });
    }

    postmark.send(message, (err, responseStatus) => {
      if (err) {
        callback(err);
      } else {
        callback(null, responseStatus);
      }
    });
  },
};
