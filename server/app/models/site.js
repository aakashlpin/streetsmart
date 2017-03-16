
let mongoose = require('mongoose'),
  Schema = mongoose.Schema;

const SiteSchema = new Schema({
  site: String,
  url: String,
});

SiteSchema.statics.post = function (data, callback) {
  const Site = new this(data);
  Site.save(callback);
};

mongoose.model('Site', SiteSchema);
