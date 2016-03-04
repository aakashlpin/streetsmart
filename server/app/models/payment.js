'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var PaymentSchema = new Schema({}, { strict: false });

mongoose.model('Payment', PaymentSchema);
