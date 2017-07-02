

let mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  _ = require('underscore'),
  config = require('../../config/config');

const SellerProductPriceHistorySchema = new Schema({
  jobId: { type: Schema.Types.ObjectId, index: true },
  email: String,
  productURL: String,
  date: Date,
  price: Number,
});

SellerProductPriceHistorySchema.statics.bulkInsert = function (models, fn) {
  if (!models || !models.length) {
    return fn('no models to insert');
  }

  const bulk = this.collection.initializeOrderedBulkOp();
  if (!bulk) {
    return fn('bulkInsertModels: MongoDb connection is not yet established');
  }

  let model;
  for (let i = 0; i < models.length; i += 1) {
    model = models[i];
    bulk.insert(model);
  }

  bulk.execute(fn);
};

const sellers = _.keys(config.sellers);
_.each(sellers, (seller) => {
  const modelName = `${seller}_product_price_history`;
  mongoose.model(modelName, SellerProductPriceHistorySchema);
});
