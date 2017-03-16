const config = require('../../config/config');
const sellerUtils = require('../utils/seller');

const { sellers } = config;
const jobModelConnections = {};
const priceHistoryConnections = {};

Object.keys(sellers).forEach((seller) => {
  jobModelConnections[seller] = sellerUtils.getSellerJobModelInstance(seller);
  priceHistoryConnections[seller] = sellerUtils.getSellerProductPriceHistoryModelInstance(seller);
});

module.exports = {
  jobModelConnections,
  priceHistoryConnections,
};
