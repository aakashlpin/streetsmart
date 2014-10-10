module.exports = {
	index: function (req, res) {
		res.render('adminIndex.html');
	},
	dashboard: function (req, res) {
		res.json({status: 'ok'});
	}
}