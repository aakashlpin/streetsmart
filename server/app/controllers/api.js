const kue = require('kue');
const Emails = require('./emails');
const _ = require('underscore');
_.str = require('underscore.string');
const mongoose = require('mongoose');
const config = require('../../config/config');
const logger = require('../../logger').logger;
const sellerUtils = require('../utils/seller');
const async = require('async');
const bgTask = require('../lib/background');
const getPriceHistoryForProduct = require('../lib/getPriceHistoryForProduct');
const isEmail = require('isemail');
const queueLib = require('../lib/queue');
const dbConnections = require('../lib/dbConnections');
const redis = require('redis');

const { jobModelConnections } = dbConnections;
const { queue, getUserJobsQueueNameForSeller } = queueLib;
const server = process.env.SERVER;
const User = mongoose.model('User');
const CountersModel = mongoose.model('Counter');
const redisClient = redis.createClient();

function illegalRequest(res) {
  res.redirect('/500');
}

function isJSONPRequested(queryParams) {
  return !!queryParams.jsonp;
}

function getResponseMethodAndManipulateHeaders(queryParams, res) {
  const isJSONP = isJSONPRequested(queryParams);
  if (isJSONP) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return 'jsonp';
  }
  return 'json';
}

function addJobToQueue(data, cb) {
  /**
  data: {seller, email, productURL, source}
  **/

  const { seller, productURL, source } = data;
  const queueName = getUserJobsQueueNameForSeller(seller);
  logger.log('info', 'adding user job to queue', queueName);

  queue
  .create(queueName, _.extend({}, data, {
    title: `Processing ${productURL} from ${source}`,
  }))
  .removeOnComplete(true)
  .attempts(3)
  .backoff(true)
  .save((saveErr) => {
    if (saveErr) {
      logger.log('error', 'Unable to add job to queue', queueName, saveErr);
      return cb('Sorry, Please try again later.');
    }
    logger.log('Added job to queue', queueName, data);
    return cb(null, 'Fantastic! Check your email for further details.');
  });
}

queue.on('job failed', (id) => {
  kue.Job.get(id, (err, job) => {
    if (err) {
      return;
    }
    const { seller, email, productURL } = job.data;
    if (job.type.indexOf('userJobs-') !== -1) {
      logger.log('job failed from queue', { type: job.type });
      Emails.sendEmailThatTheURLCannotBeAdded(
        { seller, email, productURL },
        (err) => {
          if (err) {
            logger.log('error', 'unable to Emails.sendEmailThatTheURLCannotBeAdded', { data: job.data }, err);
          }
        }
      );
    }
  });
});

module.exports = {
  processQueue(req, res) {
    const { email, url } = req.query;
    const resMethod = getResponseMethodAndManipulateHeaders(req.query, res);

    isEmail.validate(email, {
      checkDNS: true,
      errorLevel: true,
    }, (result) => {
      if (result !== 0) {
        return res.status(resMethod === 'jsonp' ? 200 : 403)[resMethod]({
          error: 'Please enter a valid email id'
        });
      }
      // Determine the seller here instead of UI
      const seller = sellerUtils.getSellerFromURL(url);
      // check if legitimate seller
      if (!sellerUtils.isLegitSeller(seller)) {
        return res.status(resMethod === 'jsonp' ? 200 : 403)[resMethod]({
          error: 'Sorry, You can\'t set an alert on this website',
        });
      }

      let productURL = url;
      const queueData = {};

      if (config.sellers[seller].hasDeepLinking) {
        productURL = sellerUtils.getDeepLinkURL(seller, url);
      }

      queueData.seller = seller;
      queueData.productURL = sellerUtils.getURLWithAffiliateId(productURL);
      queueData.email = email;
      queueData.source = isJSONPRequested(req.query) ? 'bookmarklet' : 'onsite';

      addJobToQueue(queueData, (err, response) => {
        if (err) {
          return res.status(resMethod === 'jsonp' ? 200 : 500)[resMethod]({
            error: err,
          });
        }

        res[resMethod]({
          status: response,
        });
      });
    });
  },
  getUserDetails(req, res) {
    const { email: unformattedEmail } = req.params;
    if (!unformattedEmail) {
      return res.json({ error: 'Invalid request' });
    }

    const email = decodeURIComponent(unformattedEmail);
    User.findOne({ email }, { suspended: 1, email: 1 }).lean().exec((err, userDoc) => {
      if (err || !userDoc) {
        if (err) {
          logger.log('error', 'error finding user from ui', { error: err, email });
        }
        return res.json({ status: 'error', error: 'User not found' });
      }

      if (userDoc.suspended) {
        return res.json({ status: 'pending' });
      }

      redisClient.zscore('emailAlertsSet', email, (err, reply) => {
        if (!err && reply) {
          return res.json({
            email,
            status: 'verified',
            id: userDoc._id,
            alerts: reply,
          });
        }
        return res.json({
          email,
          status: 'verified',
          id: userDoc._id,
        });
      });
    });
  },
  verifyUserId(req, res) {
    const { id: _id } = req.params;
    if (!_id) {
      return illegalRequest(res);
    }

    User.findOne({ _id }, { email: 1, _id: 1 }, (err, user) => {
      if (err) {
        logger.log('error', 'querying user db failed', { _id, err });
        return illegalRequest(res);
      }

      if (!user) {
        logger.log('error', 'user not found when querying', _id);
        return illegalRequest(res);
      }

      const { email } = user;
      User.update({ _id }, { $set: { suspended: false } }, {}, (err, result) => {
        if (!err && result) {
          return res.redirect(`/dashboard/${_id}?v=1`);
        }
        return illegalRequest(res);
      });

      Object.keys(jobModelConnections).forEach((seller) => {
        const sellerConnection = jobModelConnections[seller];
        sellerConnection.update(
          { email },
          { $set: { suspended: false } },
          { multi: true },
          (err, result) => {
            if (err) {
              return logger.log('error', 'unable to lift suspension after email verification from user', { email, err });
            }
            logger.log(`email verification activated alerts for ${seller}`, result);
          }
        );
      });
    });
  },
  redirectToSeller(req, res) {
    if (req.query.url) {
      const url = sellerUtils.getURLWithAffiliateId(decodeURIComponent(req.query.url));
      res.redirect(url);
    } else {
      res.redirect('/500');
    }
  },
  unsubscribe(req, res) {
    const queryParams = _.pick(req.query, ['email', 'productURL', 'seller', 'id']);
    let dbQuery;
    if (queryParams.seller && queryParams.id) {
      const SellerJobModel = sellerUtils.getSellerJobModelInstance(queryParams.seller);
      SellerJobModel.removeJob({ _id: queryParams.id }, (err, doc) => {
        if (err || !doc) {
          logger.log('error', 'error unsubscribing for data', dbQuery);
          return res.json({ status: 'error', error: err });
        }
        res.json({ status: 'ok' });
        logger.log('info', 'unsubscribed user from android');
      });
    } else if (queryParams.productURL && queryParams.email) {
      // unsubscribe from email + product combination
      dbQuery = {
        email: decodeURIComponent(queryParams.email),
        productURL: decodeURIComponent(queryParams.productURL),
      };

      const seller = sellerUtils.getSellerFromURL(dbQuery.productURL);
      const SellerJobModel = sellerUtils.getSellerJobModelInstance(seller);
      SellerJobModel.removeJob(dbQuery, (err, doc) => {
        if (err || !doc) {
          res.redirect('/500');
          logger.log('error', 'error unsubscribing for data', dbQuery);
          return;
        }
        if (req.xhr) {
          res.json({ status: 'ok' });
        } else {
          res.redirect('/unsubscribed');
        }
        logger.log('info', 'unsubscribed user', dbQuery);
        redisClient.zincrby('emailAlertsSet', -1, queryParams.email);
      });
    } else if (req.xhr) {
      res.json({ error: 'Invalid Request' });
    } else {
      res.redirect('/500');
    }
  },
  getTracking(req, res) {
    const seller = req.params.seller;
    const id = req.params.id;

    const queryParams = req.query || {};

    // if not a legit seller, send error page
    if (!sellerUtils.isLegitSeller(seller)) {
      res.redirect('/500');
      return;
    }

    getPriceHistoryForProduct({ seller, id, queryParams }, (err, data) => {
      if (err && !queryParams.app) {
        return res.redirect(500);
      }

      if (queryParams.app) {
        if (err) {
          return res.status(500).json({});
        }
        return res.json(data);
      }

      return res.render('track.ejs', data);
    });
  },
  getStats(req, res) {
    CountersModel.findOne().lean().exec((err, doc) => {
      const { emailsSent, itemsTracked } = doc;
      User.count((err, totalUsers) => {
        res.json({
          emailsSent,
          itemsTracked,
          totalUsers,
        });
      });
    });
  },
  getDashboard(req, res) {
    const id = req.params.id;
    const { v: viaEmailVerification } = req.query;

    User.findById(id, (err, doc) => {
      if (err || !doc) {
        res.redirect('/500');
        return;
      }

      const tmplData = _.pick(doc, ['email', 'dropOnlyAlerts']);
      tmplData._id = id;
      tmplData.baseUrl = server;
      tmplData.isViaEmailVerification = !!viaEmailVerification;
      res.render('dashboard.ejs', tmplData);
    });
  },
  getDashboardByEmail(req, res) {
    let email = req.query.email;
    if (!email) {
      res.json({ err: 'expected email' });
      return;
    }
    email = decodeURIComponent(email);
    User.findOne({ email }).lean().exec((err, user) => {
      if (err || !user) {
        res.redirect('/404');
        return;
      }
      res.redirect(`/dashboard/${user._id}`);
    });
  },
  getAllTracks(req, res) {
    const processedData = bgTask.getProcessedProducts();
    res.json(processedData);
  },
  getPagedTracks(req, res) {
    const page = req.params.page;
    if (!page) {
      return res.json({ error: 'page param missing' });
    }

    res.json({
      data: bgTask.getPagedProducts(page),
      pages: bgTask.getTotalPages(),
    });
  },
  generateAmazonReport(req, res) {
    bgTask.generateAmazonSalesReport((err) => {
      if (err) {
        return res.json({ error: 'something went wrong' });
      }
      res.json({ success: 'ok' });
    });
  },
  removeSuspension(req, res) {
    const seller = req.params.seller;
    const id = req.params.id;

    if (!config.sellers[seller]) {
      return res.status(400).json({ error: 'Illegal Request' });
    }

    const SellerModel = sellerUtils.getSellerJobModelInstance(seller);
    SellerModel.update(
      { _id: id },
      { $set: {
        suspended: false,
        createdAt: new Date(),
      } },
      {},
      (err, docs) => {
        if (!err && docs) {
          res.render('unsuspend.html');
        } else {
          res.render('500.html');
        }
      }
    );
  },
  hikePrices(callback) {
    const { sellers } = config;
    async.eachSeries(Object.keys(sellers), (seller, asyncEachCb) => {
      const SellerJobModel = sellerUtils.getSellerJobModelInstance(seller);
      const adminEmailIds = process.env.ADMIN_EMAIL_IDS.split(',');
      SellerJobModel
      .update(
        { email: { $in: adminEmailIds } },
        { $inc: { currentPrice: 500, alertToPrice: 300, alertFromPrice: 400 } },
        { multi: true },
        (err, updatedDocs) => {
          asyncEachCb(err);
          logger.log('hiked prices for admin email ids', updatedDocs);
        }
      );
    }, (err) => {
      callback(err);
    });
  },
  resetFailedCount({ seller }, callback) {
    const SellerJobModel = sellerUtils.getSellerJobModelInstance(seller);

    SellerJobModel
    .update(
      { failedAttempts: { $gte: 5 } },
      { $set: { failedAttempts: 0 } },
      { multi: true },
      (err, updatedDocs) => {
        if (err) {
          return callback(err);
        }
        return callback(null, updatedDocs);
      }
    );
  },
  unsuspendAllJobsBySeller({ seller }, callback) {
    const SellerJobModel = sellerUtils.getSellerJobModelInstance(seller);

    SellerJobModel
    .update(
      { suspended: true },
      { $set: { suspended: false } },
      { multi: true },
      (err, updatedDocs) => {
        if (err) {
          return callback(err);
        }
        return callback(null, updatedDocs);
      }
    );
  },
  ping(req, res) {
    // to test if server is up
    res.json({ status: 'ok' });
  },
};
