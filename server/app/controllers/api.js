'use strict';
var jobs = require('./jobs');
var Emails = require('./emails');
var _ = require('underscore');
var mongoose = require('mongoose');
var User = mongoose.model('User');
var Job = mongoose.model('Job');
var config = require('../../config/config');

module.exports = {
    processInputURL: function(req, res) {
        var url = req.query.url;
        jobs.processURL(url, function(err, crawledInfo) {
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
                console.log(err);
                return;
            }

            var isEmailVerified = userQueryResult && userQueryResult.email;
            if (!isEmailVerified) {
                //1. send response back for the UI
                res.json({
                    status: 'Almost Done! Just verify your email, then sit back and relax!'
                });

                //2. send verification email
                Emails.sendVerifier(userData, productData, function(err, status) {
                    if (err) {
                        console.log('error sending verification email => ', err);
                        return;
                    }
                    console.log('verification email sent to => ',
                    userData.email, ' with status => ', status);
                });

            } else {
                res.json({
                    status: 'Sweet! We\'ll keep you posted as the price changes.'
                });
            }

            var urlSymbol = productData.productURL.indexOf('?') > 0 ? '&': '?';
            productData.productURL += urlSymbol + 'affid=' + config.flipkartAffiliateId;

            //add job to the db
            var newJobData = {
                email: userData.email,
                currentPrice: productData.currentPrice,
                productName: productData.productName,
                productURL: productData.productURL,
                productImage: productData.productImage,
                seller: productData.seller,
                isEmailVerified: !!isEmailVerified
            };

            Job.post({query: newJobData}, function(err, createdJob) {
                if (err) {
                    console.log('error adding job to db => ', err);
                    return;
                }
                console.log('job created => ', createdJob);
            });
        });

    },
    verifyEmail: function(req, res) {
        var email = req.query.email;
        var userQuery = {
            query: {
                email: email
            }
        };

        //check if email has already been verified
        User.get(userQuery, function(err, userQueryResponse) {
            if (err) {
                console.log('error =>', err);
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
                    console.log('error getting user information in job collection => ', err);
                    isLegit = false;
                }
                if (!user) {
                    //bummer! Illegal request
                    console.log('Nice! Someone is trying to be hack around with the verification email!');
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
                        console.log('error putting user info in db => ', err);
                    }
                    if (userQueryResponse) {
                        console.log('user with email ', email, ' put in the verified email collection');
                    }
                });

                //update isActive for all jobs for this email to be true
                Job.activateAllJobsForEmail(userQuery, function(err, updateRes) {
                    if (err) {
                        console.log('error activating jobs => ', err);
                    }
                    if (updateRes) {
                        console.log('activated all jobs for email ', email);
                    }
                });
            });
        });
    }
};
