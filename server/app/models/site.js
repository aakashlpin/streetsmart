'use strict';
var mongoose = require('mongoose'),
Schema = mongoose.Schema;

var SiteSchema = new Schema({
    site: String,
    url: String
});

SiteSchema.statics.post = function(data, callback) {
    var Site = new this(data);
    Site.save(callback);
};

mongoose.model('Site', SiteSchema);
