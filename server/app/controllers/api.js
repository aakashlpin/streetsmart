'use strict';
var jobs = require('./jobs');
var sites = require('./sites');
var Emails = require('./emails');
var _ = require('underscore');
_.str = require('underscore.string');
var mongoose = require('mongoose');
var User = mongoose.model('User');
var Job = mongoose.model('Job');
var config = require('../../config/config');
var logger = require('../../logger').logger;
var sellerUtils = require('../utils/seller');
var async = require('async');
var bgTask = require('../lib/background');

function getURLWithAffiliateId(url) {
    var urlSymbol = url.indexOf('?') > 0 ? '&': '?';
    var seller = sellerUtils.getSellerFromURL(url);
    var sellerKey = config.sellers[seller].key,
    sellerValue = config.sellers[seller].value,
    sellerExtraParams = config.sellers[seller].extraParams;
    if (sellerKey && sellerValue) {
        var stringToMatch = sellerKey + '=' + sellerValue;
        var urlWithAffiliate;
        if (url.indexOf(stringToMatch) > 0) {
            urlWithAffiliate = url;
        } else {
            urlWithAffiliate = url + urlSymbol + stringToMatch;
        }

        //for snapdeal, they have a offer id param as well
        //in the config file, I've put it as a query string
        //so simply appending it here would work
        if (sellerExtraParams) {
            return urlWithAffiliate + sellerExtraParams;
        } else {
            return urlWithAffiliate;
        }
    }
    return url;
}

function illegalRequest(res) {
    res.redirect('/500');
}

function isJSONPRequested(queryParams) {
    return !!queryParams.jsonp;
}

function getResponseMethodAndManipulateHeaders(queryParams, res) {
    var isJSONP = isJSONPRequested(queryParams);
    if (isJSONP) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        return 'jsonp';
    }
    return 'json';
}

function createJob (data, callback) {
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

    callback = callback || function() {};

    User.findOne({email: data.email}, function(err, userQueryResult) {
        if (err) {
            logger.log('error', 'error finding email in user model', {error: err, email: data.email});
            return;
        }

        var isEmailVerified = userQueryResult ? ( userQueryResult.email ? true : false) : false,
            emailObject = { email: data.email },
            responseMessage = '',
            responseCode;

        if (!isEmailVerified) {
            logger.log('info', 'new user unverified', {email: data.email});
            responseMessage = 'Please verify your email id to activate this alert.';
            responseCode = 'pending';

            Emails.sendVerifier(emailObject, data, function(err, status) {
                if (err) {
                    logger.log('error', 'error sending verification email', {error: err, email: emailObject.email});
                    return;
                }
                logger.log('info', 'verification email triggered', {status: status, email: emailObject.email});
            });

        } else {
            logger.log('info', 'returning user', {email: userQueryResult.email});
            responseMessage = 'Awesome! Price drop alert activated.';
            responseCode = 'verified';

            Emails.sendHandshake(emailObject, data, function(err, status) {
                if (err) {
                    logger.log('error', 'error sending acceptance email', {error: err, email: emailObject.email});
                    return;
                }
                logger.log('info', 'acceptance email triggered', {status: status, email: emailObject.email});
            });

        }

        var jobData = {
            email: emailObject.email,
            currentPrice: data.currentPrice,
            productName: data.productName,
            productURL: data.productURL,
            productImage: data.productImage,
            seller: data.seller,
            source: data.source,
            isEmailVerified: isEmailVerified    //this is needed for some checks while creating a new job
        };

        Job.post({query: jobData}, function(err, createdJob) {
            if (err || !createdJob) {
                logger.log('error', 'error adding job to db', {error: err});
                return callback(null, {
                    status: err,
                    code: 'error'
                });
            }

            //increase the products counter in the db
            sellerUtils.increaseCounter('itemsTracked');
            callback(null, {
                status: responseMessage,
                code: responseCode
            });
        });
    });
}

module.exports = {
    processInputURL: function(req, res) {
        var url = req.query.url;
        var processingMode = sellerUtils.getProcessingMode(url);
        if (processingMode === 'site') {
            //video downloader process. only via bookmarklet
            sites.processSite(url, res);
            return;
        }

        var resMethod = getResponseMethodAndManipulateHeaders(req.query, res);
        jobs.processURL(url, function(err, crawledInfo) {
            if (err) {
                logger.log('error', 'processing URL from UI failed', {error: err});
                res[resMethod]({error: err});
                return;
            }
            res[resMethod](crawledInfo);
        });
    },
    processQueue: function(req, res) {
        var productData = _.pick(req.query, ['currentPrice', 'productName',
        'productURL', 'productImage']);
        var user = _.pick(req.query, ['inputEmail']);
        var resMethod = getResponseMethodAndManipulateHeaders(req.query, res);

        //Determine the seller here instead of UI
        var seller = sellerUtils.getSellerFromURL(productData.productURL);
        //check if legitimate seller
        if (!sellerUtils.isLegitSeller(seller)) {
            res[resMethod]({
                status: 'Sorry. We don\'t support this seller currently.'
            });
            return;
        }

        if (config.sellers[seller].hasDeepLinking) {
            productData.productURL = sellerUtils.getDeepLinkURL(seller, productData.productURL);
        }

        productData.seller = seller;
        productData.productURL = getURLWithAffiliateId(productData.productURL);
        productData.email = user.inputEmail;
        if (isJSONPRequested(req.query)) {
            productData.source = 'bookmarklet';
        } else {
            productData.source = 'onsite';
        }

        createJob(productData, function(err, responseObj) {
            res[resMethod](responseObj);
        });
    },
    setAlertFromURL: function (req, res) {
        //dogfooding own apis => /inputurl and /queue
        var payload = _.pick(req.query, ['url', 'email']);
        if (!payload.url || !payload.email) {
            return res.json({error: 'Invalid Request'});
        }

        var inputRequestParams = {
            url: config.server + '/inputurl',
            json: true,
            qs: payload //only `url` is needed though
        };

        request(inputRequestParams, function (error, response, body) {
            if (error) {
                logger.log('error', 'error internally making request to /inputurl', error);
                return res.json({error: 'Something went wrong! Please try again.'});
            }

            if (body.error) {
                return res.json({error: body.error});
            }

            //at this step, we are sure that there is crawled information
            var crawledData = body;
            var queueRequestParams = {
                url: config.server + '/queue',
                json: true,
                qs: _.extend({}, crawledData, {
                    email: payload.email
                })
            };

            request(queueRequestParams, function (error, response, body) {
                if (error) {
                    logger.log('error', 'error internally making request to /queue', error);
                    return res.json({error: 'Something went wrong! Please try again.'});
                }
                //body.code can be 'error', 'pending' or 'verified'
                if (body.code === 'error') {
                    return res.json(body);
                }

                return res.json(_.extend({}, body, {
                    productName: crawledData.productName,
                    productImage: crawledData.productImage
                }));
            });
        });
    },
    copyTrack: function (req, res) {
        var params = _.pick(req.query, ['id', 'seller', 'email', 'productURL']);
        //check for all params
        if (!params.id || !params.productURL || !params.seller || !params.email || params.id === 'undefined') {
            return res.json({error: 'Invalid Request'});
        }
        //check if seller param is valid
        if (!sellerUtils.isLegitSeller(params.seller)) {
            return res.json({error: 'Invalid Seller'});
        }

        sellerUtils
        .getSellerJobModelInstance(params.seller)
        .find({productURL: params.productURL})
        .lean()
        .exec(function(err, productURLDocs) {
            if (err || !productURLDocs) {
                logger.log('error', 'error finding job in db when trying to copy track', _.extend({}, params, {
                    error: err
                }));
                //if someone adds a track at the same time as OP unsubscribes it
                //then this case would happen
                return res.json({error: 'Something went wrong! Visit the product page to set the price drop alert!'});
            }

            if (_.find(productURLDocs, function (productURLDoc) {
                return productURLDoc.email === params.email;
            })) {
                return res.json({
                    id: params.id,
                    error: 'You are already tracking this item'
                });
            }

            //find the job requested from ui in the array
            var jobDoc = _.find(productURLDocs, function (productURLDoc) {
                return productURLDoc._id.toHexString() === params.id;
            });

            if (!jobDoc) {
                return res.json({error: 'Something went wrong! Visit the product page to set the price drop alert!'});
            }

            //remove the object id. let mongo create a new id
            delete jobDoc._id;

            //update the email id for new user
            jobDoc.email = params.email;
            jobDoc.seller = params.seller;
            jobDoc.source = 'copy';

            createJob(jobDoc, function(err, responseObj) {
                res.json({
                    status: responseObj.status,
                    id: params.id
                });
            });
        });
    },
    getUserDetails: function (req, res) {
        var userEmail = _.pick(req.params, ['email']);
        if (!userEmail.email) {
            return res.json({error: 'Invalid request'});
        }

        var email = decodeURIComponent(userEmail.email);
        User.findOne({email: email}).lean().exec(function (err, userDoc) {
            if (err || !userDoc) {
                if (err) {
                    logger.log('error', 'error finding user from ui', {error: err, email: email});
                }

                //if user not found in users collection
                //check for pending jobs in the jobs collections
                Job.find({email: email}).lean().exec(function (err, pendingJobs) {
                    if (err) {
                        logger.log('error', 'error finding user in jobs collection', {error: err, email: email});
                        return res.json({status: 'error', error: 'User not found'});

                    } else {
                        if (!pendingJobs.length) {
                            return res.json({status: 'error', error: 'User not found'});
                        } else {
                            return res.json({status: 'pending', alerts: pendingJobs.length});
                        }
                    }
                });

            } else {
                var userJobsCount = 0;
                async.each(_.keys(config.sellers), function (seller, asyncEachCb) {
                    sellerUtils
                    .getSellerJobModelInstance(seller)
                    .find({email: email})
                    .lean()
                    .exec(function (err, userJobs) {
                        if (!err && userJobs) {
                            userJobsCount += userJobs.length;
                        }
                        asyncEachCb();
                    });
                }, function () {
                    res.json({
                        status: 'verified',
                        email: email,
                        id: userDoc._id,
                        alerts: userJobsCount
                    });
                });
            }
        });
    },
    verifyEmail: function(req, res) {
        var queryObject = req.query;
        if (!queryObject.email) {
            illegalRequest(res);
            return;
        }

        var email;
        if (queryObject.email === decodeURIComponent(queryObject.email)) {
            //query string isn't encoded
            email = queryObject.email;
        } else {
            //query string is encoded
            email = decodeURIComponent(queryObject.email);
        }

        if (!email || (typeof email === 'undefined')) {
            illegalRequest(res);
            return;
        }

        var userQuery = {
            query: {
                email: email
            }
        };

        //check if email has already been verified
        User.get(userQuery, function(err, userQueryResponse) {
            if (err) {
                logger.log('error', 'querying user db failed', {error: err});
            }
            if (userQueryResponse && userQueryResponse.email) {
                //the user has already been verified
                res.redirect('/gameon');
                return;
            }

            //just verify that atleast one entry exists in the jobs collection for this email
            Job.get(userQuery, function(err, user) {
                var isLegit = true;
                if (err) {
                    logger.log('error', 'error getting user information in job collection', {error: err});
                    isLegit = false;
                }
                if (!user) {
                    //bummer! Illegal request
                    logger.log('warning', 'Nice! Someone is trying to be hack around with the verification email!');
                    isLegit = false;
                }

                if (!isLegit) {
                    illegalRequest(res);
                    return;
                }

                //send the emailVerified template to client
                res.redirect('/gameon');

                //put this email in the users collection
                User.post(userQuery, function(err, userQueryResponse) {
                    if (err) {
                        logger.log('error', 'error putting user info in db', {error: err});
                    }
                    if (userQueryResponse) {
                        // logger.log('info', 'user with email ', email, ' put in the verified email collection');
                        //update the users counter
                        sellerUtils.increaseCounter('totalUsers');
                    }
                });

                //update isActive for all jobs for this email to be true
                Job.activateAllJobsForEmail(userQuery, function(err, updateRes) {
                    if (err) {
                        logger.log('error', 'error activating jobs', {error: err});
                    }
                    if (updateRes) {
                        // logger.log('activated all jobs for email ', email);
                    }
                });
            });
        });
    },
    redirectToSeller: function(req, res) {
        if (req.query.url) {
            var url = getURLWithAffiliateId(decodeURIComponent(req.query.url));
            res.redirect(url);

        } else {
            res.redirect('/500');
        }
    },
    unsubscribe: function(req, res) {
        var queryParams = _.pick(req.query, ['email', 'productURL']);
        var dbQuery;
        if (queryParams.productURL && queryParams.email) {
            //unsubscribe from email + product combination
            dbQuery = {
                email: decodeURIComponent(queryParams.email),
                productURL: decodeURIComponent(queryParams.productURL)
            };

            var seller = sellerUtils.getSellerFromURL(dbQuery.productURL);
            var SellerJobModel = sellerUtils.getSellerJobModelInstance(seller);
            SellerJobModel.removeJob(dbQuery, function(err, doc) {
                if (err || !doc) {
                    res.redirect('/500');
                    logger.log('error', 'error unsubscribing for data', dbQuery);
                    return;
                }
                res.redirect('/unsubscribed');
                logger.log('info', 'unsubscribed user', dbQuery);
            });

        } else if (queryParams.email) {
            //unsubscribe all products for this email
            dbQuery = {
                email: decodeURIComponent(queryParams.email)
            };

            var sellers = _.keys(config.sellers);
            async.each(sellers, function(seller, asyncCb) {
                var SellerJobModel = sellerUtils.getSellerJobModelInstance(seller);
                SellerJobModel.removeJob(dbQuery, function(err, items) {
                    logger.log('info', 'unsubscribed user for seller', {seller: seller, items: items});
                    asyncCb(err);
                });
            }, function(err) {
                if (err) {
                    res.redirect('/500');
                    logger.log('error', 'error unsubscribing for data', dbQuery);
                    return;
                }
                res.redirect('/unsubscribed');
            });

        } else {
            res.redirect('/500');
            return;
        }

    },
    getTracking: function(req, res) {
        var seller = req.params.seller,
        id = req.params.id;

        //if not a legit seller, send error page
        if (!sellerUtils.isLegitSeller(seller)) {
            res.redirect('/500');
            return;
        }

        var SellerJobModel = sellerUtils.getSellerJobModelInstance(seller);
        SellerJobModel.findById(id, function(err, doc) {
            if (err || !doc) {
                res.redirect('/500');
                return;
            }

            var tmplData = _.pick(doc, ['productName', 'productURL',
            'productPriceHistory', 'currentPrice', 'productImage']);

            tmplData.productSeller = _.str.capitalize(seller);

            res.render('track.ejs', tmplData);
        });
    },
    getStats: function(req, res) {
        var CountersModel = mongoose.model('Counter');
        CountersModel.findOne().lean().exec(function(err, doc) {
            var resObj = _.pick(doc, ['totalUsers', 'emailsSent', 'itemsTracked']);
            res.json(resObj);
        });
    },
    getDashboard: function(req, res) {
        var id = req.params.id;

        User.findById(id, function(err, doc) {
            if (err || !doc) {
                res.redirect('/500');
                return;
            }

            var tmplData = _.pick(doc, ['email', 'dropOnlyAlerts']);
            tmplData._id = id;
            res.render('dashboard.ejs', tmplData);
        });
    },
    getDashboardByEmail: function(req, res) {
        var email = req.query.email;
        if (!email) {
            res.json({err: 'expected email'});
            return;
        }
        email = decodeURIComponent(email);
        User.findOne({email: email}).lean().exec(function(err, user) {
            if (err || !user) {
                res.redirect('/404');
                return;
            }
            res.redirect('/dashboard/' + user._id);
        });
    },
    getAllTracks: function (req, res) {
        var processedData = bgTask.getProcessedProducts();
        res.json(processedData);
    },
    getPagedTracks: function (req, res) {
        var page = req.params.page;
        if (!page) {
            return res.json({error: 'page param missing'});
        }

        res.json({
            data: bgTask.getPagedProducts(page),
            pages: bgTask.getTotalPages()
        });
    },
    resendVerificationEmail: function (req, res) {
        var email = req.params.email;
        if (!email) {
            return res.json({error: 'Expected Email'});
        }

        email = decodeURIComponent(email);
        User.findOne({email: email}).lean().exec(function(err, user) {
            if (err || !user) {
                //search for user in Jobs collections
                Job.findOne({email: email}).lean().exec(function (err, user) {
                    if (user) {
                        //send verification email
                        Emails.resendVerifierEmail(user, function (err, status) {
                            if (err) {
                                logger.log('error', 'error resending verification email', {error: err, email: user.email});
                                return;
                            }
                            logger.log('info', 'verification email resent', {status: status, email: user.email});
                        });

                        res.json({status: 'Done! Check your inbox now?'});

                    } else {
                        return res.json({error: 'Invalid Request'});
                    }
                });
            } else {
                return res.json({error: 'Invalid Request'});
            }
        });
    },
    ping: function(req, res) {
        //to test if server is up
        res.json({status: 'ok'});
    }
};
