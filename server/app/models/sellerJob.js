'use strict';

var mongoose = require('mongoose'),
Schema = mongoose.Schema,
_ = require('underscore'),
config = require('../../config/config');
// var sellerUtils = require('../utils/seller.js');

var ProductPriceHistorySchema = new Schema({
    date: Date,
    price: Number
}, {_id: false});

var SellerJobSchema = new Schema({
    email: {type: String, index: true},
    source: String,
    productURL: String,
    productName: String,
    productImage: String,
    currentPrice: Number,
    targetPrice: Number,
    alertToPrice: Number,
    alertFromPrice: Number,
    failedAttempts: Number,
    productPriceHistory: [ProductPriceHistorySchema]
});

SellerJobSchema.index({email: 1, productURL: 1});

SellerJobSchema.statics.removeJob = function(query, callback) {
    this.find(query).remove(callback);
};

SellerJobSchema.statics.getOneGeneric = function(query, callback) {
    this.findOne(query).lean().exec(callback);
};

SellerJobSchema.statics.get = function(callback) {
    this.find({}, {productPriceHistory: 0})
    .where('failedAttempts').lt(5)
    .lean()
    .exec(callback);
};

SellerJobSchema.statics.addJob = function(jobData, callback) {
    var data = _.pick(jobData, ['email', 'currentPrice', 'productURL',
    'productImage', 'productName', 'productPriceHistory', 'source']);

    (new this(data)).save(callback);
};

var sellers = _.keys(config.sellers);
_.each(sellers, function(seller) {
    var modelName = seller + '_job';
    mongoose.model(modelName, SellerJobSchema);
});
