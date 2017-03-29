const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  facebookId: String,
  twitterId: String,
  email: { type: String, index: true },
  dropOnlyAlerts: Boolean,
  verificationCodes: [String],
  deviceIds: [String],
  iOSDeviceTokens: [String],
  fullContact: Schema.Types.Mixed,
  fullContactAttempts: Number,
  androidDeviceToken: [String],
  normalizedEmail: { type: String },
  suspended: Boolean,
});

UserSchema.statics.post = (req, callback) => {
  const { email, fullContact, fullContactAttempts } = req.query;
  const data = { email, fullContact, fullContactAttempts };

  this.findOne({ email }, (err, user) => {
    if (err) {
      return callback(err);
    }
    if (user) {
      return callback(null, user);
    }

    const User = new this(data);
    User.save(callback);
  });
};

UserSchema.statics.get = (req, callback) => {
  const { email } = req.query;
  this.findOne({ email }).lean().exec(callback);
};

mongoose.model('User', UserSchema);
