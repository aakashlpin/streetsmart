var mongoose = require('mongoose'),
Article = mongoose.model('Article');

exports.index = function(req, res){
    res.render('index');
};
