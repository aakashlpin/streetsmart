const request = require('request');
const logger = require('../../logger').logger;

const fullContactAPIKeys = process.env.FULL_CONTACT_API_KEYS;

function getRequestUri(email) {
  return (`https://api.fullcontact.com/v2/person.json?email=${email}&apiKey=${fullContactAPIKeys[0]}`);
}

module.exports = {
  get(email, callback) {
    request.get({ url: getRequestUri(email), json: true }, (e, r, user) => {
      if (e) {
        logger.log('error', 'fullcontact for email ', +email, e);
        return callback(e, null);
      }
      logger.log('info', `fullcontact for email ${email}`, user);
      if (r.statusCode === 200) {
        callback(null, user);
      } else {
        callback(r.statusCode, null);
      }
    });
  },
};
