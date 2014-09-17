'use strict';
var mongoose = require('mongoose'),
Schema = mongoose.Schema;
// _ = require('underscore');

var CounterSchema = new Schema({
    totalUsers: Number,
    emailsSent: Number,
    itemsTracked: Number
});

CounterSchema.statics.initialize = function(data, callback) {
    this.find().lean().exec(function(err, docs) {
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
    }.bind(this));
};

mongoose.model('Counter', CounterSchema);
