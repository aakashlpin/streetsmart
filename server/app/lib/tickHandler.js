const logger = require('../../logger').logger;
const queueLib = require('./queue');
const chunkify = require('./chunkify');
const shuffleArray = require('shuffle-array');
const sellerUtils = require('../utils/seller');
const _ = require('underscore');
const config = require('../../config/config');

const { queue } = queueLib;

function addJobsToQueue(jobQueueName, jobs, { delay = false } = {}) {
  jobs.forEach((jobData, index) => {
    queue
    .create(jobQueueName, jobData)
    .removeOnComplete(true)
    .delay(delay ? index * (Math.floor(Math.random() * ((8 - 2) + 1)) + 2) * 1000 : 0)
    .save((saveErr) => {
      if (saveErr) {
        return logger.log('error', 'Unable to add job to queue', saveErr);
      }
      return logger.log('Added job to queue', jobQueueName, jobData);
    });
  });
}

const batchProcessing = {};

function tickHandler(seller, jobQueueName) {
  logger.log(`cron ticking for ${seller}`);

  const sellerModelKey = seller === 'amazonSlow' ? 'amazon' : seller;
  const sellerConfig = config.sellers[seller];
  const queueMethod = sellerConfig.keepSlow ? 'delayedCount' : 'inactiveCount';

  if (batchProcessing[jobQueueName]) {
    return logger.log(`skipping cron tick because batch processing ongoing for ${jobQueueName}`);
  }

  queue[queueMethod](jobQueueName, (err, total) => {
    logger.log({ err, [queueMethod]: total });
    if (err) {
      return logger.log('error', `error getting queue.${queueMethod} on ${jobQueueName}`, err);
    }

    if (total) {
      return logger.log(`not processing cron tick because ${total} items in ${jobQueueName} queue.`);
    }

    const SellerJobModel = sellerUtils.getSellerJobModelInstance(sellerModelKey);
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

      const shuffledSellerJobs = shuffleArray(sellerJobsMappedWithSeller, { copy: true });

      if (sellerConfig.keepSlow) {
        // batch process shuffledSellerJobs
        const atATime = 100;
        const batchInterval = 15 * 60 * 1000;
        const batchCount = Math.ceil(shuffledSellerJobs.length / atATime);
        const batches = chunkify(shuffledSellerJobs, batchCount, true);
        logger.log(`created ${batchCount} batches to process slow ${seller} queue @ ${atATime} items with a no processing window of ${batchInterval}ms`);

        let batchCounter = 0;
        let intervalCounter;
        const processBatch = () => {
          if (batchCounter === batchCount) {
            clearInterval(intervalCounter);
            batchProcessing[jobQueueName] = false;
            return;
          }

          logger.log(`processing batch #${batchCounter + 1} of ${batchCount} batches`);
          queue[queueMethod](jobQueueName, (err, total) => {
            if (err) {
              return logger.log('error', `error getting queue.${queueMethod} on ${jobQueueName} within setInterval`, err);
            }
            if (total) {
              return logger.log(`not processing slow seller queue because ${total} items in ${jobQueueName}`);
            }

            const batch = batches[batchCounter];
            addJobsToQueue(jobQueueName, batch, {
              delay: true,
            });

            // process next batch after another 15 mins
            batchCounter += 1;
          });
        };

        processBatch();
        intervalCounter = setInterval(() => {
          processBatch();
        }, batchInterval);
        batchProcessing[jobQueueName] = true;
      } else {
        logger.log(`adding ${sellerJobsMappedWithSeller.length} items to ${seller} queue`);
        addJobsToQueue(jobQueueName, shuffledSellerJobs);
      }
    });
  });
}

module.exports = tickHandler;
