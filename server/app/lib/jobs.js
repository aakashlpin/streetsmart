'use strict';
var logger = require('../../logger').logger;
var config = require('../../config/config');

function removeJob(job) {
    job.remove(function(err) {
        if (err) {
            logger.log('warn', 'failed to remove completed job', {id: job.id});
            return;
        }
        logger.log('info', config.jobRemovedLog, {id: job.id});
    });
}

module.exports = {
	remove: removeJob
};