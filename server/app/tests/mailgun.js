require('dotenv').config();
const { sendEmail } = require('../controllers/mailgun');

sendEmail({
  to: 'aakash.lpin@gmail.com',
  html: '<p>Hello, Cheapass.</p>',
  subject: 'Hello Mailgun',
  bcc: 'aakash@cheapass.in',
}, (err, response) => {
  if (err) {
    return console.log({ err });
  }
  return console.log({ response });
});
