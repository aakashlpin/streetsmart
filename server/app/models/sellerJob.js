

let mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  _ = require('underscore'),
  config = require('../../config/config');
// var sellerUtils = require('../utils/seller.js');

const ProductPriceHistorySchema = new Schema({
  date: Date,
  price: Number,
}, { _id: false });

const SellerJobSchema = new Schema({
  email: { type: String, index: true },
  source: String,
  productURL: String,
  productName: String,
  productImage: String,
  currentPrice: Number,
  targetPrice: Number,
  alertToPrice: Number,
  alertFromPrice: Number,
  failedAttempts: Number,
  createdAt: Date,
  suspended: Boolean,
  productPriceHistory: [ProductPriceHistorySchema],
});

SellerJobSchema.index({ email: 1, productURL: 1 });

SellerJobSchema.statics.removeJob = function (query, callback) {
  this.find(query).remove(callback);
};

SellerJobSchema.statics.getOneGeneric = function (query, callback) {
  this.findOne(query).lean().exec(callback);
};

SellerJobSchema.statics.get = function (callback) {
  this.find({
    suspended: { $ne: true },
    $or: [
        { failedAttempts: { $exists: false } },
        { failedAttempts: { $lt: 5 } },
    ],
  }, { productPriceHistory: 0 })
    .lean()
    .exec(callback);
};

SellerJobSchema.statics.addJob = function (jobData, callback) {
  const data = _.pick(jobData, ['email', 'currentPrice', 'productURL',
    'productImage', 'productName', 'productPriceHistory', 'source']);

  data.createdAt = new Date();

  (new this(data)).save(callback);
};

const sellers = _.keys(config.sellers);
_.each(sellers, (seller) => {
  const modelName = `${seller}_job`;
  mongoose.model(modelName, SellerJobSchema);
});
