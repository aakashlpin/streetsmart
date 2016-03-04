'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var FundSchema = new Schema({
    paymentId: {type: String, index: true},
    paymentDate: Date,
    buyerEmail: String,
    buyerName: String,
    buyerPhone: String,
    amount: Number,
    instamojoFees: Number,
    status: String,
    currency: String,
    contributorName: String,
    contributorUrl: String
});

mongoose.model('Fund', FundSchema);