

exports.index = function (req, res) {
  res.render('index');
};

exports.privacy = function (req, res) {
  res.render('privacy.html');
};

exports.serverError = function (req, res) {
  res.render('500.html');
};

exports.pageNotFound = function (req, res) {
  res.render('404.html');
};

exports.gameOn = function (req, res) {
  res.render('emailVerified.html');
};

exports.unsubscribed = function (req, res) {
  res.render('unsubscribed.html');
};
