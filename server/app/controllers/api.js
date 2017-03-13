const processUrl = require('../lib/processUrl');
const sites = require('./sites');
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
const request = require('request');

const server = process.env.SERVER;
const Job = mongoose.model('Job');
const User = mongoose.model('User');

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

function createJob(data, callback) {
    // data =>
    // {
    //     email: String,
    //     currentPrice: Number,
    //     productName: String,
    //     productURL: String,
    //     productImage: String,
    //     seller: String,
    //     source: String
    // }

  callback = callback || function () {};

  User.findOne({ email: data.email }, (err, userQueryResult) => {
    if (err) {
      logger.log('error', 'error finding email in user model', { error: err, email: data.email });
      return;
    }

    const isEmailVerified = userQueryResult ? (!!userQueryResult.email) : false;
    const emailObject = { email: data.email };
    let responseMessage = '';
    let responseCode;

    if (!isEmailVerified) {
      logger.log('info', 'new user unverified', { email: data.email });
      responseMessage = 'Please verify your email id to activate this alert.';
      responseCode = 'pending';

      Emails.sendVerifier(emailObject, data, (err, status) => {
        if (err) {
          logger.log('error', 'error sending verification email', { error: err, email: emailObject.email });
          return;
        }
        logger.log('info', 'verification email triggered', { status, email: emailObject.email });
      });
    } else {
      logger.log('info', 'returning user', { email: userQueryResult.email });
      responseMessage = 'Awesome! Price drop alert activated.';
      responseCode = 'verified';
    }

    const jobData = {
      email: emailObject.email,
      currentPrice: data.currentPrice,
      productName: data.productName,
      productURL: data.productURL,
      productImage: data.productImage,
      seller: data.seller,
      source: data.source,
      isEmailVerified,    // this is needed for some checks while creating a new job
    };

    Job.post({ query: jobData }, (err, createdJob) => {
      if (err || !createdJob) {
        logger.log('error', 'error adding job to db', { error: err });
        return callback(null, {
          status: err,
          code: 'error',
        });
      }

      // increase the products counter in the db
      sellerUtils.increaseCounter('itemsTracked');
      callback(null, {
        status: responseMessage,
        code: responseCode,
      });

      if (isEmailVerified) {
        emailObject._id = userQueryResult._id;
        Emails.sendHandshake(emailObject, data, (err, status) => {
          if (err) {
            logger.log('error', 'error sending acceptance email', { error: err, email: emailObject.email });
            return;
          }
          logger.log('info', 'acceptance email triggered', { status, email: emailObject.email });
        });
      }
    });
  });
}

module.exports = {
  processInputURL(req, res) {
    const url = req.query.url;
    const processingMode = sellerUtils.getProcessingMode(url);
    if (processingMode === 'site') {
      // video downloader process. only via bookmarklet
      sites.processSite(url, res);
      return;
    }

    const resMethod = getResponseMethodAndManipulateHeaders(req.query, res);
    const seller = sellerUtils.getSellerFromURL(url);

    if (!config.sellers[seller]) {
      return res[resMethod]({ error: 'Sorry! This website is not supported at the moment.' });
    }

    processUrl({
      productURL: url,
      seller,
    }, (err, crawledInfo) => {
      if (err) {
        logger.log('error', 'processing URL from UI failed', { error: err });
        return res[resMethod]({ error: err.error });
      }

      const {
        price: productPrice,
        name: productName,
        image: productImage,
      } = crawledInfo;

      res[resMethod]({
        productPrice,
        productName,
        productImage,
        seller: config.sellers[seller].name,
      });
    });
  },
  processQueue(req, res) {
    const productData = _.pick(req.query, ['currentPrice', 'productName',
      'productURL', 'productImage']);
    const user = _.pick(req.query, ['email']);
    const resMethod = getResponseMethodAndManipulateHeaders(req.query, res);

    // Determine the seller here instead of UI
    const seller = sellerUtils.getSellerFromURL(productData.productURL);
    // check if legitimate seller
    if (!sellerUtils.isLegitSeller(seller)) {
      res[resMethod]({
        status: 'Sorry! This website is not supported yet!',
      });
      return;
    }

    if (config.sellers[seller].hasDeepLinking) {
      productData.productURL = sellerUtils.getDeepLinkURL(seller, productData.productURL);
    }

    productData.seller = seller;
    productData.productURL = sellerUtils.getURLWithAffiliateId(productData.productURL);
    productData.email = user.email;
    if (isJSONPRequested(req.query)) {
      productData.source = 'bookmarklet';
    } else {
      productData.source = 'onsite';
    }

    createJob(productData, (err, responseObj) => {
      res[resMethod](responseObj);
    });
  },
  setAlertFromURL(req, res) {
        // dogfooding own apis => /inputurl and /queue
    const payload = _.pick(req.query, ['url', 'email']);
    if (!payload.url || !payload.email) {
      return res.json({ error: 'Invalid Request' });
    }

    const inputRequestParams = {
      url: `${server}/inputurl`,
      json: true,
      qs: payload, // only `url` is needed though
    };

    request(inputRequestParams, (error, response, body) => {
      if (error) {
        logger.log('error', 'error internally making request to /inputurl', error);
        return res.json({ error: 'Something went wrong! Please try again.' });
      }

      if (body.error) {
        return res.json({ error: body.error });
      }

            // at this step, we are sure that there is crawled information
      const crawledData = body;
      const queueRequestParams = {
        url: `${server}/queue`,
        json: true,
                // sanitize the data as expected by /queue
        qs: _.extend({}, crawledData, {
          email: payload.email,
          productURL: payload.url,
          currentPrice: body.productPrice,
        }),
      };

      request(queueRequestParams, (error, response, body) => {
        if (error) {
          logger.log('error', 'error internally making request to /queue', error);
          return res.json({ error: 'Something went wrong! Please try again.' });
        }
                // body.code can be 'error', 'pending' or 'verified'
        if (body.code === 'error') {
          return res.json(body);
        }

        return res.json(_.extend({}, body, {
          productName: crawledData.productName,
          productImage: crawledData.productImage,
        }));
      });
    });
  },
  copyTrack(req, res) {
    const params = _.pick(req.query, ['id', 'seller', 'email', 'productURL']);
        // check for all params
    if (!params.id || !params.productURL || !params.seller || !params.email || params.id === 'undefined') {
      return res.json({ error: 'Invalid Request' });
    }
        // check if seller param is valid
    if (!sellerUtils.isLegitSeller(params.seller)) {
      return res.json({ error: 'Invalid Seller' });
    }

    sellerUtils
    .getSellerJobModelInstance(params.seller)
    .find({ productURL: params.productURL })
    .lean()
    .exec((err, productURLDocs) => {
      if (err || !productURLDocs) {
        logger.log('error', 'error finding job in db when trying to copy track', _.extend({}, params, {
          error: err,
        }));
            // if someone adds a track at the same time as OP unsubscribes it
            // then this case would happen
        return res.json({ error: 'Something went wrong! Visit the product page to set the price drop alert!' });
      }

      if (_.find(productURLDocs, productURLDoc => productURLDoc.email === params.email)) {
        return res.json({
          id: params.id,
          error: 'You are already tracking this item',
        });
      }

        // find the job requested from ui in the array
      const jobDoc = _.find(
        productURLDocs,
        productURLDoc => productURLDoc._id.toHexString() === params.id
      );

      if (!jobDoc) {
        return res.json({ error: 'Something went wrong! Visit the product page to set the price drop alert!' });
      }

        // remove the object id. let mongo create a new id
      delete jobDoc._id;

        // update the email id for new user
      jobDoc.email = params.email;
      jobDoc.seller = params.seller;
      jobDoc.source = 'copy';

      createJob(jobDoc, (err, responseObj) => {
        res.json({
          status: responseObj.status,
          id: params.id,
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
          User.post(userQuery, (err, userQueryResponse) => {
            if (err) {
              logger.log('error', 'error putting user info in db', { error: err });
            }
            if (userQueryResponse) {
                // update the users counter
              sellerUtils.increaseCounter('totalUsers');
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

        // } else if (queryParams.email) {
        //     //unsubscribe all products for this email
        //     dbQuery = {
        //         email: decodeURIComponent(queryParams.email)
        //     };
        //
        //     var sellers = _.keys(config.sellers);
        //     async.each(sellers, function(seller, asyncCb) {
        //         var SellerJobModel = sellerUtils.getSellerJobModelInstance(seller);
        //         SellerJobModel.removeJob(dbQuery, function(err, items) {
        //             logger.log('info', 'unsubscribed user for seller', {seller: seller, items: items});
        //             asyncCb(err);
        //         });
        //     }, function(err) {
        //         if (err) {
        //             if (req.xhr) {
        //                 res.json({error: 'A request has been sent to admin to unsubscribe this product. Sorry for the inconvenience.'});
        //             } else {
        //                 res.redirect('/500');
        //             }
        //             logger.log('error', 'error unsubscribing for data', dbQuery);
        //             return;
        //         }
        //         if (req.xhr) {
        //             res.json({status: 'ok'});
        //         } else {
        //             res.redirect('/unsubscribed');
        //         }
        //     });
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
    const CountersModel = mongoose.model('Counter');
    CountersModel.findOne().lean().exec((err, doc) => {
      const resObj = _.pick(doc, ['totalUsers', 'emailsSent', 'itemsTracked']);
      res.json(resObj);
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
  ping(req, res) {
    // to test if server is up
    res.json({ status: 'ok' });
  },
};
