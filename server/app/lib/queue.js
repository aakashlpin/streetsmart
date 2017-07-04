const kue = require('kue');

const queue = kue.createQueue();

// if (process.env.IS_DEV) {
// }
kue.app.listen(process.env.KUE_PORT);

function getSellerQueueKey(seller) {
  return `scraper-${seller}`;
}

function getUserJobsQueueNameForSeller(seller) {
  return `userJobs-${seller}`;
}

function getCopyJobsQueueName() {
  return 'copyJobsQueue';
}

exports.queue = queue;
exports.getSellerQueueKey = getSellerQueueKey;
exports.getUserJobsQueueNameForSeller = getUserJobsQueueNameForSeller;
exports.getCopyJobsQueueName = getCopyJobsQueueName;
