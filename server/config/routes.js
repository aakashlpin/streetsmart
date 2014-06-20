module.exports = function(app){

	//home route
	var home = require('../app/controllers/home');
	app.get('/', home.index);

	//API
	var api = require('../app/controllers/api');
	app.get('/inputurl', api.processInputURL);
	app.get('/queue', api.processQueue);

};
