'use strict';

var mongoose = require('mongoose'),
Schema = mongoose.Schema,
_ = require('underscore');

var JobSchema = new Schema({
    email: String,
    seller: String,    //future proof
    productURL: String,
    productName: String,
    productImage: String,
    currentPrice: Number,
    productPriceHistory: [
        {
            date: Date,
            price: Number
        }
    ],
    isActive: Boolean
});

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

    this.findOne({email: data.email, productURL: data.productURL}, function(err, job) {
        if (err) {
            return callback(err);
        }

        if (job) {
            return callback('This URL is already being tracked for you.');
        }

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

    }.bind(this));
};

JobSchema.statics.getActiveJobs = function(callback) {
    this.find({isActive: true}).lean().exec(callback);
};

mongoose.model('Job', JobSchema);
