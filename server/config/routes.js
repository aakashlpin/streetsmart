'use strict';
var home = require('../app/controllers/home');
var migrations = require('../app/migrations/index');
var passport = require('passport');
var env = process.env.NODE_ENV || 'development';
var errorHandler = require('errorhandler');
var background = require('../app/lib/background');

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	else {
		if (req.xhr) {
			return res.json({error: 'Where\'s the daddy?'});
		}
		res.redirect('/admin');
	}
}

module.exports = function(app) {

	//home route
	app.get('/', home.index);
	app.get('/500', home.serverError);
	app.get('/404', home.pageNotFound);
	app.get('/gameon', home.gameOn);
	app.get('/unsubscribed', home.unsubscribed);

	//API
	var api = require('../app/controllers/api');

	//UI AJAX calls
	app.get('/inputurl', api.processInputURL);
	app.get('/queue', api.processQueue);
	app.get('/copy', api.copyTrack);
	app.get('/alert', api.setAlertFromURL);
	app.get('/user/:email', api.getUserDetails);
	app.get('/user/verify/:email', api.resendVerificationEmail);

	//Email verification
	app.get('/verify', api.verifyEmail);

	// Email Remove Suspension
	app.get('/keep-tracking/:seller/:id', api.removeSuspension);

	//Redirect to seller
	app.get('/redirect', api.redirectToSeller);

	//Unsubscribe
	app.get('/unsubscribe', api.unsubscribe);

	//User email+product page link
	app.get('/track/:seller/:id', api.getTracking);

	app.get('/api/tracks', api.getAllTracks);

	app.get('/api/tracks/:page', api.getPagedTracks);

	//new relic ping
	app.get('/ping', api.ping);

	//Tasks
	var tasks = require('../app/tasks/freecharge');
	// app.get('/emails/freecharge', tasks.sendMail);
	app.get('/emails/mailer', tasks.sendMailer);

	app.get('/stats', api.getStats);

	//user dashboard by email
	app.get('/dashboard', api.getDashboardByEmail);

	//user dashboard
	app.get('/dashboard/:id', api.getDashboard);

	//Dashboard APIs
	var dashboard = require('../app/controllers/dashboard');
	app.get('/api/dashboard/tracks/:userEmail', dashboard.getTracks);
	app.get('/api/dashboard/preferences/:userEmail', dashboard.setPreferences);
	app.get('/api/dashboard/sendDashboardLink', dashboard.sendDashboardLink);
	app.get('/api/dashboard/targetPrice', dashboard.setTargetPrice);

	//1 time migration scripts
	app.get('/migrate', migrations.assignDatesToAllExistingAlerts);

	//Mobile APIs
	var mobile = require('../app/controllers/mobile');
	app.all('/mobile/initiate', mobile.initiateDeviceRegistration);
	app.all('/mobile/verify', mobile.verifyDeviceRegistration);

	app.post('/mobile/register', mobile.finalizeDeviceRegistration);

	// iOS APIs
	app.post('/mobile/register/ios', mobile.storeIOSDeviceToken);
	app.get('/mobile/simulate/ios', mobile.simulateIOSNotification);

	app.get('/mobile/simulate', mobile.simulateNotification);

	//Admin
	var admin = require('../app/controllers/admin');
	app.get('/admin', admin.index);
	app.get('/admin/dashboard', ensureAuthenticated, admin.dashboard);
	app.get('/admin/dashboard/users', ensureAuthenticated, admin.getUsers);
	app.get('/admin/dashboard/reminder', ensureAuthenticated, admin.reminderEmail);

	app.get('/auth/twitter', passport.authenticate('twitter'));
	app.get('/auth/twitter/callback',
		passport.authenticate('twitter', { successRedirect: '/admin/dashboard', failureRedirect: '/admin' }));

	app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['public_profile', 'email'] }));
	app.get('/auth/facebook/callback',
		passport.authenticate('facebook', { successRedirect: '/admin/dashboard', failureRedirect: '/admin' }));

	// Fundraiser
	var fundraise = require('../app/controllers/fundraise');
	app.get('/contributors', fundraise.index);
	app.post('/fundraise', fundraise.add);

	// Reports
	app.get('/get-report', api.generateAmazonReport);

	app.get('/hack', function (req, res) {
		background.generateReviewEmailForAlertsTask(function (err, alerts) {
			if (err) {
				return res.status(500).json({error: err})
			}
			res.json({
				data: alerts,
			})
		})
	})

	app.use(function(req, res) {
			res.status(404).render('404', { title: '404' });
	});

	// error handling middleware should be loaded after the loading the routes
	if (env === 'development') {
	  app.use(errorHandler())
	}
};
