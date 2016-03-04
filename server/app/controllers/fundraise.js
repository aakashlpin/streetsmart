'use strict';

var _ = require('underscore');
var camelCase = require('camelcase');
var mongoose = require('mongoose');
var FundModel = mongoose.model('Fund');
var PaymentModel = mongoose.model('Payment');
var env = process.env.NODE_ENV || 'development';

module.exports = {
  index: function (req, res) {
    var since = req.query.since;
    FundModel.find({}, {
      contributorName: 1,
      contributorUrl: 1,
      amount: 1
    }).sort('-amount').exec(function (err, docs) {
      if (err) {
        return res.redirect('/500');
      }
      res.render('contributorsIndex.ejs', {contributions: docs});
    });
  },

  add: function (req) {
    var requestProps = _.pick(req.body, ['offer_slug', 'fees', 'payment_id', 'mac',
    'custom_fields', 'unit_price', 'buyer', 'buyer_name', 'buyer_phone',
    'variants', 'amount', 'offer_title', 'quantity', 'status', 'currency']);

    var instamojoContributorNameCustomField = 'Field_52849';
    var instamojoContributorUrlCustomField = 'Field_73129';

    var p = Object.keys(requestProps).reduce(function (camelCasedProps, prop) {
      camelCasedProps[camelCase(prop)] = requestProps[prop];
      return camelCasedProps;
    }, {});

    if (p.status !== 'Credit') {
      return;
    }

    p.customFields = JSON.parse(p.customFields);

    var contributorName = p.customFields[instamojoContributorNameCustomField].value.length
      ? p.customFields[instamojoContributorNameCustomField].value
      : p.buyerName;

    var contributorUrl = p.customFields[instamojoContributorUrlCustomField].value.length
      ? p.customFields[instamojoContributorUrlCustomField].value
      : null;

    var fundObject = new FundModel({
      paymentId: p.paymentId,
      paymentDate: new Date(),
      buyerEmail: p.buyer,
      buyerName: p.buyerName,
      buyerPhone: p.buyerPhone,
      amount: p.amount,
      instamojoFees: p.fees,
      status: p.status,
      currency: p.currency,
      contributorName: contributorName,
      contributorUrl: contributorUrl
    });

    fundObject.save();

    var paymentObject = new PaymentModel(req.body);

    paymentObject.save();
  }
}
