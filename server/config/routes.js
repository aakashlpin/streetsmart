'use strict';
var home = require('../app/controllers/home');
var migrations = require('../app/migrations/index');

module.exports = function(app){

	//home route
	app.get('/', home.index);
	app.get('/500', home.serverError);
	app.get('/gameon', home.gameOn);
	app.get('/unsubscribed', home.unsubscribed);

	//API
	var api = require('../app/controllers/api');

	//UI AJAX calls
	app.get('/inputurl', api.processInputURL);
	app.get('/queue', api.processQueue);

	//Email verification
	app.get('/verify', api.verifyEmail);

	//Redirect to seller
	app.get('/redirect', api.redirectToSeller);

	//Unsubscribe
	app.get('/unsubscribe', api.unsubscribe);

	//User email+product page link
	app.get('/track/:seller/:id', api.getTracking);

	//new relic ping
	app.get('/ping', api.ping);

	//1 time migration scripts
	app.get('/migrate', migrations.markAllJobsAsActive);
};
