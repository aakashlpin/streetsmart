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
    //     seller: String
    // }

    callback = callback || function() {};

    User.findOne({email: data.email}, function(err, userQueryResult) {
        if (err) {
            logger.log('error', 'error finding email in user model', {error: err, email: data.email});
            return;
        }

        var isEmailVerified = userQueryResult ? ( userQueryResult.email ? true : false) : false,
            emailObject = { email: data.email },
            responseMessage = '';

        if (!isEmailVerified) {
            logger.log('info', 'new user unverified', {email: data.email});
            responseMessage = 'Almost Done! Just verify your email, then sit back and relax!';

            Emails.sendVerifier(emailObject, data, function(err, status) {
                if (err) {
                    logger.log('error', 'error sending verification email', {error: err, email: emailObject.email});
                    return;
                }
                logger.log('info', 'verification email triggered', {status: status, email: emailObject.email});
            });

        } else {
            logger.log('info', 'returning user', {email: userQueryResult.email});
            responseMessage = 'Sweet! We\'ll keep you posted as the price changes.';

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
            isEmailVerified: isEmailVerified    //this is needed for some checks while creating a new job
        };

        Job.post({query: jobData}, function(err, createdJob) {
            if (err || !createdJob) {
                logger.log('error', 'error adding job to db', {error: err});
                return callback(null, responseMessage);
            }

            //increase the products counter in the db
            sellerUtils.increaseCounter('itemsTracked');
            callback(null, responseMessage);
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
                res[resMethod]({error: 'Oops. Our servers screwed up! Try again, please?'});
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

        createJob(productData, function(err, responseMessage) {
            res[resMethod]({
                status: responseMessage
            });
        });
    },
    copyTrack: function (req, res) {
        var params = _.pick(req.query, ['id', 'seller', 'email']);
        //check for all params
        if (!params.id || !params.seller || !params.email) {
            return res.json({error: 'Invalid Request'});
        }
        //check if seller param is valid
        if (!sellerUtils.isLegitSeller(params.seller)) {
            return res.json({error: 'Invalid Seller'});
        }
        //check if email exists
        sellerUtils
        .getSellerJobModelInstance(params.seller)
        .findById(params.id)
        .lean()
        .exec(function(err, jobDoc) {
            if (err || !jobDoc) {
                logger.log('error', 'error finding job by id in db when trying to copy track', {
                    error: err,
                    id: params.id,
                    seller: params.seller
                });
                return res.json({error: 'Job not found'});
            }

            if (jobDoc.email === params.email) {
                return res.json({error: 'You are already tracking this item'});
            }

            //remove the object id. let mongo create a new id
            delete jobDoc._id;

            //update the email id for new user
            jobDoc.email = params.email;

            createJob(jobDoc, function(err, responseMessage) {
                res.json({status: responseMessage});
            });
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
    ping: function(req, res) {
        //to test if server is up
        res.json({status: 'ok'});
    }
};
