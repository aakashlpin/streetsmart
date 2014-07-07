var winston = require('winston');
winston.add(winston.transports.DailyRotateFile, {
    filename: './logs/log',
    datePattern: '.yyyy-MM-ddTHH',
    handleExceptions: true
});

function processLogs() {
	//this z gotta be called from a cronjob and put in some kind of kue
	var options = {
	    from: new Date - 24 * 60 * 60 * 1000,
	    until: new Date,
	    limit: 10,
	    start: 0,
	    order: 'desc',
	    fields: ['message']
	  };
  	winston.query(options, function(err, results) {
  		if (err) {
  			throw err;
  		}

  		console.log(results);

  		//TODO check this out

  		//write to a file this results json
  		//send to self an email with attachment of this file
  	})
}

exports.logger = winston;
exports.logsProcessor = processLogs;