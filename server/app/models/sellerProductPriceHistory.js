

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

// SellerProductPriceHistorySchema.index({email: 1, productURL: 1});

const sellers = _.keys(config.sellers);
_.each(sellers, (seller) => {
  const modelName = `${seller}_product_price_history`;
  mongoose.model(modelName, SellerProductPriceHistorySchema);
});
