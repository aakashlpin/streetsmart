'use strict';
var mongoose = require('mongoose'),
Schema = mongoose.Schema,
_ = require('underscore');

var UserSchema = new Schema({
    facebookId: String,
    twitterId: String,
    email: String,
    dropOnlyAlerts: Boolean,
    verificationCodes: [String],
    deviceIds: [String]
});

UserSchema.statics.post = function(req, callback) {
    var data = _.pick(req.query, ['email']),
    User;

    this.findOne({email: data.email}, function(err, user) {
        if (err) {
            return callback(err);
        }
        if (user) {
            return callback(null, user);
        }

        User = new this(data);
        User.save(callback);

    }.bind(this));
};

UserSchema.statics.get = function(req, callback) {
    var data = _.pick(req.query, ['email']);
    this.findOne({email: data.email}).lean().exec(callback);
};

UserSchema.statics.getAll = function(callback) {
    this.find().lean().exec(callback);
};

mongoose.model('User', UserSchema);
