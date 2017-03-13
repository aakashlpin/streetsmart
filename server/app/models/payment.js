

let mongoose = require('mongoose'),
  Schema = mongoose.Schema;

const PaymentSchema = new Schema({}, { strict: false });

mongoose.model('Payment', PaymentSchema);
