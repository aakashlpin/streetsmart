const kue = require('kue');
const _ = require('underscore');
const CronJob = require('cron').CronJob;
const config = require('../config/config');
const sellerUtils = require('./utils/seller');
const processJob = require('./lib/processJob');
const bgTask = require('./lib/background');
const logger = require('../logger').logger;

const { sellers } = config;

function getSellerQueueKey(seller) {
  return `scraper-${seller}`;
}

const queue = kue.createQueue();

if (process.env.IS_DEV) {
  kue.app.listen(process.env.KUE_PORT);
}

if (process.env.IS_CRON_ACTIVE) {
  const sellerKeys = Object.keys(sellers);
  const activeSellerKeys =
    sellerKeys
      .filter(key => sellers[key].isCronActive);


  activeSellerKeys.forEach((seller) => {
    const jobQueueName = getSellerQueueKey(seller);
    const sellerConfig = config.sellers[seller];

    logger.log(`Booting: Setting up ${seller} cron tab ${process.env[sellerConfig.cronKey]}`);

    // Setup cron jobs
    new CronJob({
      cronTime: process.env[sellerConfig.cronKey],
      start: true,
      timeZone: 'Asia/Kolkata',
      onTick: () => {
        logger.log(`cron ticking for ${seller}`);
        queue.inactiveCount(jobQueueName, (err, total) => {
          logger.log({ err, inactiveCount: total });
          if (err) {
            return logger.log('error', `error getting queue.inactiveCount on ${jobQueueName}`, err);
          }

          if (total) {
            return logger.log(`not processing cron tick because ${total} items in ${jobQueueName} queue.`);
          }

          const SellerJobModel = sellerUtils.getSellerJobModelInstance(seller);
          SellerJobModel.get((err, sellerJobs) => {
            if (err) {
              return logger.log('error', `CRITICAL: error in doing SellerJobModel.get on ${SellerJobModel.modelName}`);
            }

            if (!sellerJobs) {
              return logger.log('warning', `cron tick: no seller jobs for ${seller}`);
            }

            const sellerJobsMappedWithSeller = sellerJobs.map(sellerJob =>
              _.extend({}, sellerJob, {
                seller,
                title: `Processing ${sellerJob.productName}`,
              })
            );

            sellerJobsMappedWithSeller.forEach((jobData) => {
              queue
                .create(jobQueueName, jobData)
                .removeOnComplete(true)
                .priority(process.env.ADMIN_EMAIL_IDS.indexOf(jobData.email) > -1 ? 'high' : 'normal')
                .save((saveErr) => {
                  if (saveErr) {
                    return logger.log('error', 'Unable to add job to queue', saveErr);
                  }
                  return logger.log('Added job to queue', jobQueueName, jobData);
                });
            });
          });
        });
      },
    });

    // Start processing existing jobs
    const concurrency = sellerConfig.hasMicroService ? 1 : 4;
    queue.process(jobQueueName, concurrency, (job, done) =>
      processJob(job, done)
    );
  });
}

queue.on('error', (err) => {
  logger.log('Oops..', err);
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
  new CronJob({
    cronTime: process.env.HOME_PAGE_FEED_INTERVAL,
    onTick: bgTask.processAllProducts,
    start: true,
    timeZone: 'Asia/Kolkata'
  });

  new CronJob({
    cronTime: process.env.FULL_CONTACT_INTERVAL,
    onTick: bgTask.getFullContactByEmail,
    start: true,
    timeZone: 'Asia/Kolkata'
  });

  new CronJob({
    cronTime: process.env.REMOVE_FAILED_JOBS_INTERVAL,
    onTick: bgTask.removeFailedJobs,
    start: true,
    timeZone: 'Asia/Kolkata'
  });

  bgTask.processAllProducts();
}

setup();
