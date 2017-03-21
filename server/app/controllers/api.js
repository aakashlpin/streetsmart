const kue = require('kue');
const Emails = require('./emails');
const _ = require('underscore');
_.str = require('underscore.string');
const mongoose = require('mongoose');
const UserLookup = require('../lib/userLookup');
const config = require('../../config/config');
const logger = require('../../logger').logger;
const sellerUtils = require('../utils/seller');
const async = require('async');
const bgTask = require('../lib/background');
const isEmail = require('isemail');
const queueLib = require('../lib/queue');

const { queue, getUserJobsQueueNameForSeller } = queueLib;
const server = process.env.SERVER;
const Job = mongoose.model('Job');
const User = mongoose.model('User');
const CountersModel = mongoose.model('Counter');

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
    const userEmail = _.pick(req.params, ['email']);
    if (!userEmail.email) {
      return res.json({ error: 'Invalid request' });
    }

    const email = decodeURIComponent(userEmail.email);
    User.findOne({ email }).lean().exec((err, userDoc) => {
      if (err || !userDoc) {
        if (err) {
          logger.log('error', 'error finding user from ui', { error: err, email });
        }

        // if user not found in users collection
        // check for pending jobs in the jobs collections
        Job.find({ email }).lean().exec((err, pendingJobs) => {
          if (err) {
            logger.log('error', 'error finding user in jobs collection', { error: err, email });
            return res.json({ status: 'error', error: 'User not found' });
          } else if (!pendingJobs.length) {
            return res.json({ status: 'error', error: 'User not found' });
          }
          return res.json({ status: 'pending', alerts: pendingJobs.length });
        });
      } else {
        let userJobsCount = 0;
        async.each(_.keys(config.sellers), (seller, asyncEachCb) => {
          sellerUtils
          .getSellerJobModelInstance(seller)
          .find({ email })
          .lean()
          .exec((err, userJobs) => {
            if (!err && userJobs) {
              userJobsCount += userJobs.length;
            }
            asyncEachCb();
          });
        }, () => {
          res.json({
            status: 'verified',
            email,
            id: userDoc._id,
            alerts: userJobsCount,
          });
        });
      }
    });
  },
  verifyEmail(req, res) {
    const queryObject = req.query;
    if (!queryObject.email) {
      illegalRequest(res);
      return;
    }

    let email;
    if (queryObject.email === decodeURIComponent(queryObject.email)) {
      // query string isn't encoded
      email = queryObject.email;
    } else {
      // query string is encoded
      email = decodeURIComponent(queryObject.email);
    }

    if (!email || (typeof email === 'undefined')) {
      illegalRequest(res);
      return;
    }

    const userQuery = {
      query: {
        email,
      },
    };

    // check if email has already been verified
    User.get(userQuery, (err, userQueryResponse) => {
      if (err) {
        logger.log('error', 'querying user db failed', { error: err });
      }
      if (userQueryResponse && userQueryResponse.email) {
        // the user has already been verified
        res.redirect('/gameon');
        return;
      }

      // just verify that atleast one entry exists in the jobs collection for this email
      Job.get(userQuery, (err, user) => {
        let isLegit = true;
        if (err) {
          logger.log('error', 'error getting user information in job collection', { error: err });
          isLegit = false;
        }
        if (!user) {
          // bummer! Illegal request
          logger.log('warning', 'Nice! Someone is trying to be hack around with the verification email!');
          isLegit = false;
        }

        if (!isLegit) {
          illegalRequest(res);
          return;
        }

        // send the emailVerified template to client
        res.redirect('/gameon');

        UserLookup.get(email, (err, data) => {
          // put this email in the users collection
          userQuery.query.fullContact = err ? {} : data;
          userQuery.query.fullContactAttempts = 1;
          User.post(userQuery, (err) => {
            if (err) {
              logger.log('error', 'error putting user info in db', { error: err });
            }
          });
        });

        // update isActive for all jobs for this email to be true
        Job.activateAllJobsForEmail(userQuery, (err, updateRes) => {
          if (err) {
            logger.log('error', 'error activating jobs', { error: err });
          }
          if (updateRes) {
            // logger.log('activated all jobs for email ', email);
          }
        });
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

    // fetch the price from productPriceHistory Collection
    sellerUtils
    .getSellerProductPriceHistoryModelInstance(seller)
    .find({ jobId: id }, { price: 1, date: 1 })
    .sort({ date: 1 })
    .lean()
    .exec((err, priceHistoryDocs) => {
      if (err) {
        logger.log('error', 'error getting price history docs for %s', id);
        res.redirect('/500');
        return;
      }

      if (queryParams.app) {
        res.json(priceHistoryDocs);
        return;
      }

      sellerUtils
        .getSellerJobModelInstance(seller)
        .findById(id, { productPriceHistory: 0 }, (err, doc) => {
          if (err || !doc) {
            res.redirect('/500');
            return;
          }

          const tmplData = _.pick(doc, ['productName', 'productURL',
            'currentPrice', 'productImage']);

          tmplData.productPriceHistory = priceHistoryDocs;

          tmplData.productSeller = _.str.capitalize(seller);

          tmplData.baseUrl = server;

          res.render('track.ejs', tmplData);
        });
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

    User.findById(id, (err, doc) => {
      if (err || !doc) {
        res.redirect('/500');
        return;
      }

      const tmplData = _.pick(doc, ['email', 'dropOnlyAlerts']);
      tmplData._id = id;
      tmplData.baseUrl = server;
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
  resendVerificationEmail(req, res) {
    let email = req.params.email;
    if (!email) {
      return res.json({ error: 'Expected Email' });
    }

    email = decodeURIComponent(email);
    User.findOne({ email }).lean().exec((err, user) => {
      if (err || !user) {
        // search for user in Jobs collections
        Job.findOne({ email }).lean().exec((err, user) => {
          if (user) {
            // send verification email
            Emails.resendVerifierEmail(user, (err, status) => {
              if (err) {
                logger.log('error', 'error resending verification email', { error: err, email: user.email });
                return;
              }
              logger.log('info', 'verification email resent', { status, email: user.email });
            });

            res.json({ status: 'Done! Check your inbox now?' });
          } else {
            return res.json({ error: 'Invalid Request' });
          }
        });
      } else {
        return res.json({ error: 'Invalid Request' });
      }
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
