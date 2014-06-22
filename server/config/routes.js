'use strict';
module.exports = function(app){

	//home route
	var home = require('../app/controllers/home');
	app.get('/', home.index);
	app.get('/500', home.serverError);
	app.get('/gameon', home.gameOn);

	//API
	var api = require('../app/controllers/api');
	app.get('/inputurl', api.processInputURL);
	app.get('/queue', api.processQueue);

	//Email verification
	app.get('/verify', api.verifyEmail);

	//Redirect to flipkart
	app.get('/redirect', api.redirectToSeller);
};
