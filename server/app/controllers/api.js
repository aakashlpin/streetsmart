var jobs = require('./jobs');
module.exports = {
    processInputURL: function(req, res) {
        var url = req.query.url;
        jobs.processURL(url, function(crawledInfo) {
            res.json(crawledInfo);
        });
    },
    processQueue: function(req, res) {
        res.json({
            isEmailVerified: false
        })
    }
}
