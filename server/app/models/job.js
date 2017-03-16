let mongoose = require('mongoose'),
  _ = require('underscore'),
  SellerUtils = require('../utils/seller'),
  logger = require('../../logger').logger;

let Schema = mongoose.Schema;

const JobSchema = new Schema({
  email: { type: String, index: true },
  seller: String,
  productURL: String,
  productName: String,
  productImage: String,
  currentPrice: Number,
  isActive: Boolean,
  isReminded: Boolean,
  source: String,
});

JobSchema.statics.activateAllJobsForEmail = function (req, callback) {
  const query = _.pick(req.query, ['email']);
  const data = { isActive: true };
  const options = { multi: true };

    // pull out all jobs for this email and distribute them across collections
  this.find(query).lean().exec((err, pendingJobs) => {
    if (err) {
      return callback(err);
    }
    _.each(pendingJobs, (pendingJob) => {
      const SellerJobModel = SellerUtils.getSellerJobModelInstance(pendingJob.seller);
      SellerJobModel.addJob(pendingJob);
    });
  });

    // also mark these jobs as activated
  this.update(query, data, options, callback);
};

JobSchema.statics.post = function (req, callback) {
  let data,
    Job;

  data = _.pick(req.query, [
    'email', 'currentPrice', 'productURL', 'seller', 'isEmailVerified',
    'productImage', 'productName', 'source',
  ]);

  const SellerJobModel = SellerUtils.getSellerJobModelInstance(data.seller);
  const findQuery = { email: data.email, productURL: data.productURL };
  SellerJobModel.getOneGeneric(findQuery, (err, existingJob) => {
    if (err) {
      logger.log('error', 'error in jobs post in getOneGeneric', err);
      return callback('Sorry! Something went wrong. Please try again.');
    }

    if (existingJob) {
            // bullshit. guy is trying to enter the same email+url combo again
      callback('You are already tracking this item!');
    } else {
            // good guy. put it in jobs collection and seller's jobs collection
      findQuery.isActive = false;
      this.findOne(findQuery).lean().exec((err, pendingJob) => {
        if (err) {
          logger.log('error', 'error in jobs post in findOne', err);
          return callback('Sorry! Something went wrong. Please try again.');
        }
        if (pendingJob) {
                    // not-so-good guy. he should have verified his email
          callback('Please verify your email id to activate this alert.');
        } else {
          const jobData = {
            email: data.email,
            productURL: data.productURL,
            productName: data.productName,
            productImage: data.productImage,
            seller: data.seller,
            currentPrice: data.currentPrice,
            productPriceHistory: [{
              date: new Date(),
              price: data.currentPrice,
            }],
            isActive: data.isEmailVerified,
            source: data.source,
          };

          Job = new this(jobData);
          Job.save(callback);

          if (data.isEmailVerified) {
            SellerJobModel.addJob(jobData, () => {});
          }
        }
      });
    }
  });
};

JobSchema.statics.updateNewPrice = function (query, updateWith, callback) {
  const seller = SellerUtils.getSellerFromURL(query.productURL);
  const sellerJobModel = SellerUtils.getSellerJobModelInstance(seller);
  sellerJobModel.updateNewPrice(query, updateWith, callback);
};

JobSchema.statics.get = function (req, callback) {
    // get all the jobs for an email
  const data = _.pick(req.query, ['email']);
  this.find({ email: data.email }).lean().exec(callback);
};

mongoose.model('Job', JobSchema);
