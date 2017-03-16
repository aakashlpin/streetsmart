const _ = require('underscore');
const camelCase = require('camelcase');
const mongoose = require('mongoose');

const FundModel = mongoose.model('Fund');
const PaymentModel = mongoose.model('Payment');
const env = process.env.NODE_ENV || 'development';

module.exports = {
  index(req, res) {
    // const since = req.query.since;
    FundModel.find({}, {
      contributorName: 1,
      contributorUrl: 1,
      amount: 1,
    }).sort('-amount').exec((err, docs) => {
      if (err) {
        return res.redirect('/500');
      }
      res.render('contributorsIndex.ejs', { contributions: docs });
    });
  },

  add(req) {
    const requestProps = _.pick(req.body, ['offer_slug', 'fees', 'payment_id', 'mac',
      'custom_fields', 'unit_price', 'buyer', 'buyer_name', 'buyer_phone',
      'variants', 'amount', 'offer_title', 'quantity', 'status', 'currency']);

    const instamojoContributorNameCustomField = 'Field_52849';
    const instamojoContributorUrlCustomField = 'Field_73129';

    const p = Object.keys(requestProps).reduce((camelCasedProps, prop) => {
      camelCasedProps[camelCase(prop)] = requestProps[prop];
      return camelCasedProps;
    }, {});

    if (p.status !== 'Credit') {
      return;
    }

    p.customFields = JSON.parse(p.customFields);

    const contributorName = p.customFields[instamojoContributorNameCustomField].value.length
      ? p.customFields[instamojoContributorNameCustomField].value
      : p.buyerName;

    const contributorUrl = p.customFields[instamojoContributorUrlCustomField].value.length
      ? p.customFields[instamojoContributorUrlCustomField].value
      : null;

    const fundObject = new FundModel({
      paymentId: p.paymentId,
      paymentDate: new Date(),
      buyerEmail: p.buyer,
      buyerName: p.buyerName,
      buyerPhone: p.buyerPhone,
      amount: p.amount,
      instamojoFees: p.fees,
      status: p.status,
      currency: p.currency,
      contributorName,
      contributorUrl,
    });

    fundObject.save();

    const paymentObject = new PaymentModel(req.body);

    paymentObject.save();
  },
};
