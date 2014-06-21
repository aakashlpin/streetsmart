'use strict';
var jobs = require('./jobs');
var Emails = require('./emails');
var _ = require('underscore');
var mongoose = require('mongoose');
var User = mongoose.model('User');
var Job = mongoose.model('Job');

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

    }
};
