module.exports = function(app){

	//home route
	var home = require('../app/controllers/home');
	app.get('/', home.index);

	//API
	var jobs = require('../app/controllers/jobs');
	app.get('/inputurl', jobs.processURL);
	app.get('/queue', jobs.processQueue);

};
