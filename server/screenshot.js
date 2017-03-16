
const s3 = require('s3');
const spawn = require('child_process').spawn;

const screenShotName = `ss_amazon_${Date.now()}.png`;

const client = s3.createClient({
  s3Options: {
    accessKeyId: 'AKIAIFTVMHU7YXZR6HUQ',
    secretAccessKey: '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',
  },
});

const args = [
  '--uri', 'http://www.amazon.in/gp/goldbox/ref=nav_topnav_deals',
  '--user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.122 Safari/537.36',
  '--viewportsize', '2000x768',
  '--output', screenShotName,
];

args.push('--selector', '.SINGLE-DEAL-LARGE');
// args.push('--selector', '.ONETHIRTYFIVE-HERO .gbwshoveler ul');
args.push('--javascript-file', `${__dirname}/amazon_hide.js`);

const screenShotProcess = spawn('capturejs', args, {
  cwd: `${__dirname}/screenshots`,
});

screenShotProcess.on('error', (err) => {
  console.log('err', err);
});

screenShotProcess.on('close', () => {
  console.log('screenshot taken');
  const params = {
    localFile: `${__dirname}/screenshots/${screenShotName}`,
    s3Params: {
      Bucket: 'cheapass-india',
      Key: screenShotName,
      ACL: 'public-read',
    },
  };

  const uploader = client.uploadFile(params);
  uploader.on('error', (err) => {
    console.error('unable to upload:', err.stack);
  });

  uploader.on('end', () => {
    console.log('done uploading', screenShotName);
  });
});
