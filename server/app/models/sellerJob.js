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
    productPriceHistory: [ProductPriceHistorySchema]
});

SellerJobSchema.statics.removeJob = function(query, callback) {
    this.findOne(query).remove(callback);
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

SellerJobSchema.statics.addJob = function(jobData, callback) {
    var data = _.pick(jobData, ['email', 'currentPrice', 'productURL',
    'productImage', 'productName', 'productPriceHistory']);

    (new this(data)).save(callback);
};

var sellers = _.keys(config.sellers);
_.each(sellers, function(seller) {
    var modelName = seller + '_job';
    mongoose.model(modelName, SellerJobSchema);
});
