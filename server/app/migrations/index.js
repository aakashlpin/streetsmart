//
// const mongoose = require('mongoose');
// const JobModel = mongoose.model('Job');
// const _ = require('underscore');
// const sellerUtils = require('../utils/seller');
// const config = require('../../config/config');
// const async = require('async');
// const logger = require('../../logger').logger;
// const urlLib = require('url');
//
// function spliceArray(arr, batchSize) {
//   const processedArr = [];
//   const processedArrLength = Math.ceil(arr.length / batchSize);
//   for (let i = 0; i < processedArrLength; i++) {
//     if (i < processedArrLength - 1) {
//       processedArr.push(arr.slice(i * batchSize, (i * batchSize) + batchSize));
//     } else {
//       processedArr.push(arr.splice(i * batchSize, arr.length));
//     }
//   }
//
//   return processedArr;
// }
//
// module.exports = {
//   shardJobs(req, res) {
//     JobModel.find({ isActive: true }).lean().exec((err, jobs) => {
//       _.each(jobs, (job) => {
//         delete job._id;
//         delete job.isActive;
//
//         job.seller = job.seller.toLowerCase();
//         const seller = job.seller;
//
//         const mongooseModelForSeller = sellerUtils.getSellerJobModelInstance(seller);
//
//         delete job.seller;
//
//         mongooseModelForSeller.addJob(job);
//       });
//     });
//
//     res.json({ status: 'ok' });
//   },
//   markAllJobsAsActive(req, res) {
//     const sellers = _.keys(config.sellers);
//     async.each(sellers, (seller, asyncCb) => {
//       const sellerModel = sellerUtils.getSellerJobModelInstance(seller);
//       sellerModel.markActive((err, done) => {
//         logger.log(done);
//         asyncCb(err);
//       });
//     }, (err) => {
//       if (err) {
//         res.json({ error: err });
//       } else {
//         res.json({ status: 'ok' });
//       }
//     });
//   },
//   normalizeFlipkartURLs(req, res) {
//     const mongooseModelForFlipkart = sellerUtils.getSellerJobModelInstance('flipkart');
//     mongooseModelForFlipkart.normalizeURL((err) => {
//       if (err) {
//         logger.log(err);
//       }
//     });
//     res.json({ status: 'ok' });
//   },
//   initializeCounters(req, res) {
//     async.parallel([
//       function (callback) {
//         const mongooseUsersModel = mongoose.model('User');
//         mongooseUsersModel.find().lean().exec((err, users) => {
//           callback(null, users.length);
//         });
//       },
//       function (callback) {
//         const mongooseJobsModel = mongoose.model('Job');
//         mongooseJobsModel.find().lean().exec((err, jobs) => {
//           callback(null, jobs.length);
//         });
//       }],
//             (err, results) => {
//               const mongooseCounterModel = mongoose.model('Counter');
//               mongooseCounterModel.initialize({
//                 totalUsers: results[0],
//                 itemsTracked: results[1],
//                 emailsSent: 9524,   // from Postmark since 2nd July 2014
//               }, (err) => {
//                 if (err) {
//                   logger.log('error in initializing counters');
//                 } else {
//                   logger.log('counters initialized');
//                 }
//               });
//               res.json({ status: 'ok' });
//             },
//         );
//   },
//   removeAllInActiveJobs(req, res) {
//     const sellers = _.keys(config.sellers);
//     async.each(sellers, (seller, asyncCb) => {
//       const sellerModel = sellerUtils.getSellerJobModelInstance(seller);
//       sellerModel.find({ isActive: false }).remove((err, done) => {
//         logger.log(done);
//         asyncCb(err);
//       });
//     }, (err) => {
//       if (err) {
//         res.json({ error: err });
//       } else {
//         res.json({ status: 'ok' });
//       }
//     });
//   },
//   smartFlipkartURLs(req, res) {
//     const mongooseModelForFlipkart = sellerUtils.getSellerJobModelInstance('flipkart');
//     mongooseModelForFlipkart.find({}).lean().exec((err, docs) => {
//       docs.forEach((doc) => {
//         const existingURL = doc.productURL;
//         const newURL = existingURL.replace('www.flipkart', 'dl.flipkart');
//         mongooseModelForFlipkart.update({ _id: doc._id }, { productURL: newURL }, {}, (err) => {
//           if (err) {
//             logger.log(err);
//           }
//         });
//       });
//     });
//     res.json({ status: 'ok' });
//   },
//   sanitizeSnapdealUrls(req, res) {
//     const mongooseModelForSnapdeal = sellerUtils.getSellerJobModelInstance('snapdeal');
//     mongooseModelForSnapdeal.find({}).lean().exec((err, docs) => {
//       docs.forEach((doc) => {
//         const pUrl = urlLib.parse(doc.productURL, true);
//         const newURL = (`${pUrl.protocol}//${pUrl.host}${pUrl.pathname}`);
//         const newAffUrl = sellerUtils.getURLWithAffiliateId(newURL);
//         mongooseModelForSnapdeal.update({ _id: doc._id }, { productURL: newAffUrl }, {}, (err) => {
//           if (err) {
//             logger.log(err);
//           }
//         });
//       });
//     });
//     res.json({ status: 'ok' });
//   },
//   unwindProductPriceHistory(req, res) {
//     const sellers = _.keys(config.sellers);
//     const maxBatchSize = 1000;
//     async.eachSeries(sellers, (seller, asyncCb) => {
//       const sellerModel = sellerUtils.getSellerJobModelInstance(seller);
//       const sellerProductPriceHistoryModel = sellerUtils.getSellerProductPriceHistoryModelInstance(seller);
//       sellerModel
//             .find({}, { productPriceHistory: 1, email: 1, productURL: 1 })
//             .lean()
//             .exec((err, docs) => {
//               let unwindedDocs = [];
//               unwindedDocs = docs.map(doc => doc.productPriceHistory.map(pphItem => ({
//                 date: pphItem.date,
//                 price: pphItem.price,
//                 email: doc.email,
//                 jobId: doc._id,
//                 productURL: doc.productURL,
//               })));
//
//               unwindedDocs = _.flatten(unwindedDocs);
//
//               if (!unwindedDocs.length) {
//                 return asyncCb();
//               }
//
//               sellerProductPriceHistoryModel.collection.remove((err) => {
//                 if (err) {
//                   return asyncCb(`Error with removing collection${JSON.stringify(err)}`);
//                 }
//
//                 logger.log('info', 'seller %s - total docs - %d begin at %s', seller, unwindedDocs.length, (new Date()).toString());
//
//                 const batchedUnwindedDocs = spliceArray(unwindedDocs, maxBatchSize);
//                 logger.log('info', 'batchedUnwindedDocs length - %d', batchedUnwindedDocs.length);
//                 let count = 0;
//                 unwindedDocs = null;
//                 async.each(batchedUnwindedDocs, (batchedDocs, batchedDocsAsyncCb) => {
//                   sellerProductPriceHistoryModel.collection.insert(batchedDocs, (err, insertedDocs) => {
//                     if (err) {
//                       logger.log('error', err);
//                       return batchedDocsAsyncCb(`Error with inserting in collection${JSON.stringify(err)}`);
//                     }
//                     logger.log('info', 'seller %s - docs inserted - %d at %s count %d', seller, insertedDocs && insertedDocs.length || 0, (new Date()).toString(), ++count);
//                             // insertedDocs = null;
//                     batchedDocsAsyncCb();
//                   });
//                 }, (err) => {
//                   asyncCb(err);
//                   count = 0;
//                 });
//               });
//             });
//     }, (err) => {
//       if (err) {
//         res.json({ error: err });
//       } else {
//         res.json({ status: 'ok' });
//       }
//     });
//   },
//   assignDatesToAllExistingAlerts(req, res) {
//     const sellers = _.keys(config.sellers);
//     async.eachSeries(sellers, (seller, asyncOuterCb) => {
//       const sellerModel = sellerUtils.getSellerJobModelInstance(seller);
//       sellerModel.find({}, { _id: 1 }).lean().exec((err, docs) => {
//         async.eachSeries(docs, (doc, asyncInnerCb) => {
//           sellerModel.update(
//               { _id: doc._id },
//               { createdAt: doc._id.getTimestamp() },
//               {},
//               (err, updatedDoc) => {
//                 asyncInnerCb(err);
//               },
//             );
//         }, (err) => {
//           asyncOuterCb(err);
//         });
//       });
//     }, (err) => {
//       if (err) {
//         res.json({ error: err });
//       } else {
//         res.json({ sttaus: 'ok' });
//       }
//     });
//   },
// };
