let util = require('util'),
  OperationHelper = require('../lib/apac').OperationHelper;

const opHelper = new OperationHelper({
  awsId: '[YOUR AWS ID HERE]',
  awsSecret: '[YOUR AWS SECRET HERE]',
  assocId: '[YOUR ASSOCIATE TAG HERE]',
});

opHelper.execute('ItemSearch', {
  SearchIndex: 'Books',
  Keywords: 'harry potter',
  ResponseGroup: 'ItemAttributes,Offers',
}, (err, results) => {
  console.log(results);
});
