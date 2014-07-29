'use strict';

var mongoose = require('mongoose'),
Schema = mongoose.Schema,
_ = require('underscore'),
config = require('../../config/config');

var ProductPriceHistorySchema = new Schema({
    date: Date,
    price: Number
}, {_id: false});

var SellerJobSchema = new Schema({
    email: String,
    productURL: String,
    productName: String,
    productImage: String,
    currentPrice: Number,
    isActive: {type: Boolean, default: true},  //This field identifies if email has to be sent if price changes. We'll continue processing each URL forever. Will build some admin panel someday to remove tracking URLs.
    productPriceHistory: [ProductPriceHistorySchema]
});

SellerJobSchema.statics.removeJob = function(query, callback) {
    //it'll pass back the found docs back to the callback
    var updateParams = {isActive: false};
    var updateOptions = {multi: true};
    this.update(query, updateParams, updateOptions, callback);
};

SellerJobSchema.statics.updateNewPrice = function(query, updateWith, callback) {
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

SellerJobSchema.statics.getOneGeneric = function(query, callback) {
    this.findOne(query).lean().exec(callback);
};

SellerJobSchema.statics.get = function(callback) {
    this.find().lean().exec(callback);
};

SellerJobSchema.statics.addJob = function(jobData, callback) {
    var data = _.pick(jobData, ['email', 'currentPrice', 'productURL',
    'productImage', 'productName', 'productPriceHistory']);

    (new this(data)).save(callback);
};

SellerJobSchema.statics.markActive = function(done) {
    this.update({}, {isActive: true}, {multi: true}, function(err, doc) {
        if (err) {
            console.log('error while marking active at db level', err);
            done(err);
            return;
        }
        done(null, doc);
    });
};

var sellers = _.keys(config.sellers);
_.each(sellers, function(seller) {
    var modelName = seller + '_job';
    mongoose.model(modelName, SellerJobSchema);
});
