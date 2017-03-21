
let mongoose = require('mongoose'),
  Schema = mongoose.Schema;
// _ = require('underscore');

const CounterSchema = new Schema({
  emailsSent: Number,
  itemsTracked: Number,
});

CounterSchema.statics.initialize = function (data, callback) {
  this.find().lean().exec((err, docs) => {
    if (err) {
      var Counters = new this(data);
      Counters.save(callback);
      return;
    }
    if (!docs || (docs && !docs.length)) {
      var Counters = new this(data);
      Counters.save(callback);
      return;
    }

    callback(null, 0);
  });
};

mongoose.model('Counter', CounterSchema);
