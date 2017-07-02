const getPriceHistoryForProduct = require('../lib/getPriceHistoryForProduct');

exports.productEmbedOnBlog = (req, res) => {
  const { sellerId: seller, productId: id } = req.params;
  getPriceHistoryForProduct({ seller, id }, (err, data) => {
    if (err) {
      return res.redirect('/500');
    }
    res.render('embed.ejs', data);
  });
};
