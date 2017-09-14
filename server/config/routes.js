
const home = require('../app/controllers/home');
const blog = require('../app/controllers/blog');
const api = require('../app/controllers/api');
const dashboard = require('../app/controllers/dashboard');
const mobile = require('../app/controllers/mobile');
const admin = require('../app/controllers/admin');
const fundraise = require('../app/controllers/fundraise');
const passport = require('passport');
const errorHandler = require('errorhandler');
const background = require('../app/lib/background');
// const mailgun = require('../app/controllers/mailgun');
const Emails = require('../app/controllers/emails');
// const migrations = require('../app/migrations/index');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  if (req.xhr) {
    return res.json({ error: 'Where\'s the daddy?' });
  }
  res.redirect('/admin');
}

module.exports = function routes(app) {
  // home route
  app.get('/', home.index);
  app.get('/privacy', home.privacy);
  app.get('/500', home.serverError);
  app.get('/404', home.pageNotFound);
  app.get('/gameon', home.gameOn);
  app.get('/unsubscribed', home.unsubscribed);

  // blog controller
  app.get('/embed/:sellerId/:productId', blog.productEmbedOnBlog);

  // API

  // UI AJAX calls
  app.get('/queue', api.processQueue);
  app.get('/user/:email', api.getUserDetails);

  // Email verification
  app.get('/verify/:id', api.verifyUserId);

  // Email Remove Suspension
  app.get('/keep-tracking/:seller/:id', api.removeSuspension);

  // Redirect to seller
  app.get('/redirect', api.redirectToSeller);

  // Unsubscribe
  app.get('/unsubscribe', api.unsubscribe);

  // User email+product page link
  app.get('/track/:seller/:id', api.getTracking);

  app.get('/api/tracks', api.getAllTracks);

  app.get('/api/tracks/:page', api.getPagedTracks);

  // new relic ping
  app.get('/ping', api.ping);

  app.get('/stats', api.getStats);

  // user dashboard by email
  app.get('/dashboard', api.getDashboardByEmail);

  // user dashboard
  app.get('/dashboard/:id', api.getDashboard);

  // Dashboard APIs
  app.get('/api/dashboard/tracks/:userEmail', dashboard.getTracks);
  app.get('/api/dashboard/preferences/:userEmail', dashboard.setPreferences);
  app.get('/api/dashboard/sendDashboardLink', dashboard.sendDashboardLink);
  app.get('/api/dashboard/targetPrice', dashboard.setTargetPrice);

  // 1 time migration scripts
  // app.get('/migrate', migrations.assignDatesToAllExistingAlerts);

  // Mobile APIs
  app.all('/mobile/initiate', mobile.initiateDeviceRegistration);
  app.all('/mobile/verify', mobile.verifyDeviceRegistration);

  app.post('/mobile/register', mobile.finalizeDeviceRegistration);

  // iOS APIs
  app.post('/mobile/register/ios', mobile.storeIOSDeviceToken);
  app.get('/mobile/simulate/ios', mobile.simulateIOSNotification);

  app.get('/mobile/simulate', mobile.simulateNotification);

  // Admin
  app.get('/admin', admin.index);
  app.get('/admin/dashboard', ensureAuthenticated, admin.dashboard);
  app.get('/admin/dashboard/users', ensureAuthenticated, admin.getAdminUsers);
  // app.get('/admin/dashboard/reminder', ensureAuthenticated, admin.reminderEmail);

  app.get('/auth/twitter', passport.authenticate('twitter'));
  app.get('/auth/twitter/callback',
    passport.authenticate('twitter', { successRedirect: '/admin/dashboard', failureRedirect: '/admin' }));

  app.get('/auth/facebook', passport.authenticate('facebook', { scope: 'public_profile,email' }));
  app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { successRedirect: '/admin/dashboard', failureRedirect: '/admin' }));

  // Fundraiser
  app.get('/contributors', fundraise.index);
  app.post('/fundraise', fundraise.add);

  // Reports
  app.get('/get-report', ensureAuthenticated, api.generateAmazonReport);

  app.get('/suspend', ensureAuthenticated, (req, res) => {
    background.generateReviewEmailForAlertsTask((err, alerts) => {
      if (err) {
        return res.status(500).json({ error: err });
      }
      res.json({
        data: alerts,
      });
    });
  });

  app.get('/send-suspend-email', ensureAuthenticated, (req, res) => {
    background.sendSuspensionEmail((err, alerts) => {
      if (err) {
        return res.status(500).json({ error: err });
      }
      res.json({
        data: alerts,
      });
    });
  });

  app.get('/hikeprices', ensureAuthenticated, (req, res) => {
    api.hikePrices((err) => {
      if (err) {
        return res.json({ err });
      }
      res.json({ status: 'ok' });
    });
  });

  app.get('/reset-failed-count-for-seller', ensureAuthenticated, (req, res) => {
    const { seller } = req.query;
    if (!seller) {
      return res.status(403).json({
        error: 'require seller key'
      });
    }
    api.resetFailedCount({ seller }, (err, response) => {
      if (err) {
        return res.status(500).json({
          error: err,
        });
      }
      res.json({
        status: 'ok',
        response,
      });
    });
  });

  app.get('/unsuspend-all-jobs-by-seller', ensureAuthenticated, (req, res) => {
    const { seller } = req.query;
    if (!seller) {
      return res.status(403).json({
        error: 'require seller key'
      });
    }
    api.unsuspendAllJobsBySeller({ seller }, (err, response) => {
      if (err) {
        return res.status(500).json({
          error: err,
        });
      }
      res.json({
        status: 'ok',
        response,
      });
    });
  });

  app.get('/admin/add-users-to-mailing-list', ensureAuthenticated, (req, res) => {
    const { alertsCount, listEmailId } = req.query;
    if (!alertsCount || !listEmailId) {
      res.status(500).send('sample usage: /admin/add-users-to-mailing-list?alertsCount=5&listEmailId=updates@cheapass.in ');
      return;
    }
    background.addUsersToMailingList({
      alertsCount: Number(alertsCount),
      listEmailId,
    }, (err, reply) => {
      if (err) {
        return res.status(500).json({
          error: err,
        });
      }

      res.json(reply);
    });
  });

  app.get('/send-survey-email', ensureAuthenticated, (req, res) => {
    Emails.sendSurveyPromoEmail(() => {
      res.json({ status: 'ok' });
    });
  });

  app.use((req, res) => {
    res.status(404).render('404', { title: '404' });
  });

  // error handling middleware should be loaded after the loading the routes
  if (process.env.IS_DEV) {
    app.use(errorHandler());
  }
};
