'use strict';
var jobs = require('./jobs');
var Emails = require('./emails');
var _ = require('underscore');
var mongoose = require('mongoose');
var User = mongoose.model('User');
var Job = mongoose.model('Job');
var config = require('../../config/config');
var logger = require('../../logger').logger;

function getURLWithAffiliateId(url) {
    var urlSymbol = url.indexOf('?') > 0 ? '&': '?';
    var stringToMatch = config.flipkartAffiliateKey + '=' + config.flipkartAffiliateId;
    if (url.indexOf(stringToMatch) > 0) {
        return url;
    } else {
        return url + urlSymbol + stringToMatch;
    }
}

module.exports = {
    processInputURL: function(req, res) {
        var url = req.query.url;
        jobs.processURL(url, function(err, crawledInfo) {
            if (err) {
                logger.log('error', 'processing URL from UI failed', {error: err});
                res.json({error: 'Oops. Our servers screwed up! Try again, please?'});
                return;
            }
            res.json(crawledInfo);
        });
    },
    processQueue: function(req, res) {
        var productData = _.pick(req.query, ['currentPrice', 'productName',
        'productURL', 'productImage', 'seller']);
        var user = _.pick(req.query, ['inputEmail']);

        var userData = {
            email: user.inputEmail
        };

        var userQuery = {
            query: userData
        };

        User.get(userQuery, function(err, userQueryResult) {
            if (err) {
                logger.log(err);
                return;
            }

            var isEmailVerified = userQueryResult ? ( userQueryResult.email ? true : false) : false;
            if (!isEmailVerified) {
                //1. send response back for the UI
                logger.log('info', 'new user unverified', {email: userData.email});
                res.json({
                    status: 'Almost Done! Just verify your email, then sit back and relax!'
                });

                //2. send verification email
                Emails.sendVerifier(userData, productData, function(err, status) {
                    if (err) {
                        logger.log('error', 'error sending verification email', {error: err});
                        return;
                    }
                    logger.log('info', 'verification email triggered', {status: status});
                });

            } else {
                logger.log('info', 'returning user', {email: userQueryResult.email});
                res.json({
                    status: 'Sweet! We\'ll keep you posted as the price changes.'
                });
            }

            //add job to the db
            var newJobData = {
                email: userData.email,
                currentPrice: productData.currentPrice,
                productName: productData.productName,
                productURL: getURLWithAffiliateId(productData.productURL),
                productImage: productData.productImage,
                seller: productData.seller,
                isEmailVerified: isEmailVerified    //this is needed for some checks while creating a new job
            };

            Job.post({query: newJobData}, function(err, createdJob) {
                if (err) {
                    logger.log('error', 'error adding job to db', {error: err});
                    return;
                }
            });
        });

    },
    verifyEmail: function(req, res) {
        var email = decodeURIComponent(req.query.email);
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
                    res.redirect('/500');
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

        } else if (queryParams.email) {
            //unsubscribe all products for this email
            dbQuery = {
                email: decodeURIComponent(queryParams.email)
            };

        } else {
            res.redirect('/500');
            return;
        }

        Job.markJobsAsInactive(dbQuery, function(err, dbQueryRes) {
            if (err) {
                logger.log('error', 'error unsubscribing', {email: queryParams.email});
            } else {
                // logger.log('user documents unsubscribed => ', dbQueryRes);
            }
        });
    }
};
