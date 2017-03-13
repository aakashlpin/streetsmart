
const s3 = require('s3');
const moment = require('moment');
const logger = require('../../logger').logger;

const env = process.env.NODE_ENV || 'development';

const client = s3.createClient({
  s3Options: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function __sync(params, name) {
  const uploader = client.uploadDir(params);

  uploader.on('error', (err) => {
    logger.log('error', 'unable to sync:', err.stack);
  });

  uploader.on('end', () => {
    logger.log('info', 'done uploading %s at %s', name, moment().format('MMMM Do YYYY, h:mm:ss a'));
  });
}

function sync() {
  const logsSyncParams = {
    localDir: `${__dirname}/../../logs`,
    s3Params: {
      Bucket: 'cheapass-india',
      Prefix: `logs-backup/${env}`,
    },
  };

  __sync(logsSyncParams, 'logs');
}

module.exports = {
  sync,
};
