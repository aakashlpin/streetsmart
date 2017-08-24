const kue = require('kue');
const CronJob = require('cron').CronJob;
const config = require('../config/config');
const processJob = require('./lib/processJob');
const processUserJob = require('./lib/processUserJob');
const processCopyJob = require('./lib/processCopyJob');
const bgTask = require('./lib/background');
const logger = require('../logger').logger;
const queueLib = require('./lib/queue');
const tickHandler = require('./lib/tickHandler');

const {
  queue,
  getSellerQueueKey,
  getUserJobsQueueNameForSeller,
  getCopyJobsQueueName,
} = queueLib;
const { sellers } = config;
const sellerKeys = Object.keys(sellers);

function setupCronFromSeller(seller) {
  const jobQueueName = getSellerQueueKey(seller);
  const sellerConfig = config.sellers[seller];

  logger.log(`Booting: Setting up ${seller} cron tab ${process.env[sellerConfig.cronKey]}`);

  // Setup cron jobs
  new CronJob({
    cronTime: process.env[sellerConfig.cronKey],
    start: true,
    timeZone: 'Asia/Kolkata',
    onTick: () => {
      tickHandler(seller, jobQueueName);
    },
  });

  // Start processing existing jobs
  const concurrency = sellerConfig.concurrency || 4;
  queue.process(jobQueueName, concurrency, (job, done) => {
    processJob(job, done);
  });
}

if (process.env.IS_CRON_ACTIVE) {
  const activeSellerKeys =
    sellerKeys
      .filter(key => sellers[key].isCronActive);

  activeSellerKeys.forEach(seller => setupCronFromSeller(seller));
}

// start processing items added from UI
sellerKeys.forEach((seller) => {
  const queueName = getUserJobsQueueNameForSeller(seller);
  const sellerConfig = config.sellers[seller];
  logger.log('info', 'setting up user job queue processing', queueName);
  const concurrency = sellerConfig.userJobConcurrency || 4;
  queue.process(queueName, concurrency, (job, done) =>
    processUserJob(job, done)
  );
});

const copyQueueName = getCopyJobsQueueName();
queue.process(copyQueueName, (job, done) =>
  processCopyJob(job, done)
);

queue.on('error', (err) => {
  logger.log('error', 'CRITICAL!! queue error', err);
});


queue.watchStuckJobs();

queue.active((err, ids) => {
  ids.forEach((id) => {
    kue.Job.get(id, (err, job) => {
      job.inactive();
    });
  });
});

process.once('uncaughtException', (err) => {
  console.error('Something bad happened: ', err);
  queue.shutdown(1000, (err2) => {
    logger.log('error', 'Kue shutdown result: ', err2 || 'OK');
    process.exit(0);
  });
});

function setup() {
  if (process.env.HOME_PAGE_FEED_INTERVAL) {
    new CronJob({
      cronTime: process.env.HOME_PAGE_FEED_INTERVAL,
      onTick: bgTask.processAllProducts,
      start: true,
      timeZone: 'Asia/Kolkata'
    });
  }

  if (process.env.FULL_CONTACT_INTERVAL) {
    new CronJob({
      cronTime: process.env.FULL_CONTACT_INTERVAL,
      onTick: bgTask.getFullContactByEmail,
      start: true,
      timeZone: 'Asia/Kolkata'
    });
  }

  if (process.env.REMOVE_FAILED_JOBS_INTERVAL) {
    new CronJob({
      cronTime: process.env.REMOVE_FAILED_JOBS_INTERVAL,
      onTick: bgTask.removeFailedJobs,
      start: true,
      timeZone: 'Asia/Kolkata'
    });
  }

  if (process.env.PROCESS_ALL_USERS_INTERVAL) {
    new CronJob({
      cronTime: process.env.PROCESS_ALL_USERS_INTERVAL,
      onTick: bgTask.processAllUsers,
      start: true,
      timeZone: 'Asia/Kolkata'
    });
  }

  if (process.env.RESET_FAILURE_COUNT_INTERVAL) {
    new CronJob({
      cronTime: process.env.RESET_FAILURE_COUNT_INTERVAL,
      onTick: bgTask.grantFailedProductsAnotherChance,
      start: true,
      timeZone: 'Asia/Kolkata'
    });
  }

  if (!process.env.IS_DEV) {
    bgTask.processAllProducts();
    bgTask.processAllUsers();
  }
}

setup();
