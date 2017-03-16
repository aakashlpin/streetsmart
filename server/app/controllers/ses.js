const ses = require('node-ses');
const _ = require('underscore');
const parseString = require('xml2js').parseString;

const client = ses.createClient({
  key: process.env.AWS_ACCESS_KEY_ID,
  secret: process.env.AWS_SECRET_ACCESS_KEY,
});

module.exports = {
  sendEmail(payload, callback) {
    const message = {
      from: 'Cheapass India <notifications@cheapass.in>',
      to: payload.to,
      message: payload.html,
      subject: payload.subject,
      replyTo: 'aakash@cheapass.in',
    };

    if (payload.bcc) {
      _.extend(message, {
        bcc: payload.bcc,
      });
    }

    if (payload.from) {
      _.extend(message, {
        from: payload.from,
      });
    }

    client.sendemail(message, (err, response) => {
      if (err) {
        callback(err);
      } else {
        parseString(response, (err, result) => {
          if (err) {
            callback('done');
          } else {
            let messageId;
            try {
              messageId = result.SendEmailResponse.SendEmailResult[0].MessageId[0];
            } catch (e) {
              messageId = 'done';
            } finally {
              callback(null, messageId);
            }
          }
        });
      }
    });
  },
};
