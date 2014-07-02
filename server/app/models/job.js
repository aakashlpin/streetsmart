'use strict';

var mongoose = require('mongoose'),
Schema = mongoose.Schema,
_ = require('underscore');

var ProductPriceHistorySchema = new Schema({
    date: Date,
    price: Number
}, {_id: false});

var JobSchema = new Schema({
    email: String,
    seller: String,    //future proof
    productURL: String,
    productName: String,
    productImage: String,
    currentPrice: Number,
    productPriceHistory: [ProductPriceHistorySchema],
    isActive: Boolean
});

JobSchema.statics.markJobsAsInactive = function(query, callback) {
    var updateWith = {isActive: false};
    var updateOptions = {multi: true};
    this.update(query, updateWith, updateOptions, callback);
};

JobSchema.statics.updateNewPrice = function(query, updateWith, callback) {
    var newPrice = updateWith.price;
    this.findOne(query, function(err, doc) {
        var updateParams = {
            productPriceHistory: doc.productPriceHistory
        };
        var updateOptions = {};

        if (doc) {
            updateParams.productPriceHistory.push({
                date: new Date(),
                price: newPrice
            });

            if (doc.currentPrice !== newPrice) {
                updateParams.currentPrice = newPrice;
            }

            this.update(query, updateParams, updateOptions, callback);

        } else {
            callback(err, null);
        }
    }.bind(this));
};

JobSchema.statics.get = function(req, callback) {
    //get all the jobs for an email
    var data = _.pick(req.query, ['email']);
    this.find({email: data.email}).lean().exec(callback);
};

JobSchema.statics.getOneGeneric = function(query, callback) {
    this.findOne(query).lean().exec(callback);
};

JobSchema.statics.activateAllJobsForEmail = function(req, callback) {
    var query    = _.pick(req.query, ['email']);
    var data     = {isActive: true};
    var options  = {multi: true};
    this.update(query, data, options, callback);
};

JobSchema.statics.post = function(req, callback) {
    var data, Job;

    data = _.pick(req.query,
        ['email', 'currentPrice', 'productURL', 'seller', 'isEmailVerified',
        'productImage', 'productName']
    );

    var findQuery = {email: data.email, productURL: data.productURL};
    this.findOne(findQuery, function(err, job) {
        if (err) {
            return callback(err);
        }

        if (job) {
            if (!job.isActive && job.isEmailVerified) {
                //use case:
                //person starts tracking a product
                //then unsubscribes for this product
                //then starts tracking this product again
                //since I want to maintain uniqueness of email+productURL, updating it
                this.update(findQuery, {isActive: true}, {}, callback);

            } else {
                callback('This URL is already being tracked for you.');
            }

        } else {
            //create a new job entry
            Job = new this({
                email: data.email,
                productURL: data.productURL,
                productName: data.productName,
                productImage: data.productImage,
                seller: data.seller || 'Flipkart',
                currentPrice: data.currentPrice,
                productPriceHistory: [{
                    date: new Date(),
                    price: data.currentPrice
                }],
                isActive: data.isEmailVerified
            });

            Job.save(callback);
        }

    }.bind(this));
};

JobSchema.statics.getActiveJobs = function(callback) {
    this.find({isActive: true}).lean().exec(callback);
};

JobSchema.statics.getActiveJobsForSeller = function(seller, callback) {
    this.find({seller: seller, isActive: true}).lean().exec(callback);
};

mongoose.model('Job', JobSchema);
