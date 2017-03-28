const mongoose = require('mongoose');
const config = require('../../config/config');

const Schema = mongoose.Schema;

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
});

SellerJobSchema.index({ email: 1, productURL: 1 });

SellerJobSchema.statics.removeJob = (query, callback) => {
  this.find(query).remove(callback);
};

SellerJobSchema.statics.getOneGeneric = (query, callback) => {
  this.findOne(query).lean().exec(callback);
};

SellerJobSchema.statics.get = (callback) => {
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

SellerJobSchema.statics.addJob = (jobData, callback) => {
  const { email, currentPrice, productURL, productImage, productName, source } = jobData;

  const data = {
    email,
    currentPrice,
    productURL,
    productName,
    productImage,
    source,
    createdAt: new Date(),
  };

  const JobData = new this(data);
  JobData.save(callback);
};

Object.keys(config.sellers).forEach((seller) => {
  const modelName = `${seller}_job`;
  mongoose.model(modelName, SellerJobSchema);
});
