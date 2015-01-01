'use strict';
var _ = require('underscore');
_.str = require('underscore.string');
var initialBatchSize = 50;
var futureBatchSize = 20;

process.on('message', function (allTracks) {
	var totalPages = 0;
	var processedData = _.sortBy(_.flatten(allTracks, true), 'eyes').reverse();
	var pagedProcessedData = {};
	//1st page = initialBatchSize
	//next page onwards = futureBatchSize
	if (processedData.length < initialBatchSize) {
		totalPages = 1;
	} else {
		totalPages = 1 + (processedData.length - initialBatchSize)/futureBatchSize;
		if (totalPages !== parseInt(totalPages)) {
			totalPages += 1;
		}
	}

	var tmpTotalPages = totalPages;
	var page = 1;

	while (tmpTotalPages) {
		if (page === 1) {
			pagedProcessedData[page] = _.first(processedData, initialBatchSize);
		} else {
			var beginIndex = initialBatchSize + ((page - 2) * futureBatchSize) - 1;
			var endIndex = beginIndex + futureBatchSize;
			pagedProcessedData[page] = processedData.slice(beginIndex, endIndex);
		}

		tmpTotalPages -= 1;
		page += 1;
	}

	process.send({
		totalPages: totalPages,
		processedData: processedData,
		pagedProcessedData: pagedProcessedData
	});

	process.exit(0);
});