var jobs = require('./jobs');
var emails = require('./emails');
var _ = require('underscore');
module.exports = {
    processInputURL: function(req, res) {
        var url = req.query.url;
        jobs.processURL(url, function(crawledInfo) {
            res.json(crawledInfo);
        });
    },
    processQueue: function(req, res) {
        var data = _.pick(req.query, ['currentPrice', 'productName', 'productURL']);
        var user = _.pick(req.query, ['inputEmail']);

        var userData = {
            email: user.inputEmail
        };

        var productData = {
            name: data.productName,
            price: data.currentPrice,
            url: data.productURL
        };

        emails.send(userData, productData, function(err, status) {
            if (err) {
                res.json({err: err});
                return;
            }

            res.json({
                status: status
            })
        });
    }
}
