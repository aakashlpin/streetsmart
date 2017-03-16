let RSH = require('./RequestSignatureHelper').RequestSignatureHelper,
  http = require('http'),
  xml2js = require('xml2js');

const OperationHelper = function (params) {
  this.init(params);
};

OperationHelper.version = '2011-08-01';
OperationHelper.service = 'AWSECommerceService';
OperationHelper.defaultEndPoint = 'ecs.amazonaws.com';
OperationHelper.defaultBaseUri = '/onca/xml';

OperationHelper.prototype.init = function (params) {
  params = params || {};

    // check requried params
  if (typeof (params.awsId) === 'undefined') { throw 'Missing AWS Id param'; }
  if (typeof (params.awsSecret) === 'undefined') { throw 'Missing AWS Secret param'; }
  if (typeof (params.assocId) === 'undefined') { throw 'Missing Associate Id param'; }

    // set instance variables from params
  this.awsId = params.awsId;
  this.awsSecret = params.awsSecret;
  this.assocId = params.assocId;
  this.endPoint = params.endPoint || OperationHelper.defaultEndPoint;
  this.baseUri = params.baseUri || OperationHelper.defaultBaseUri;
  this.xml2jsOptions = params.xml2jsOptions || {};
};

OperationHelper.prototype.getSignatureHelper = function () {
  if (typeof (this.signatureHelper) === 'undefined') {
    const params = {};
    params[RSH.kAWSAccessKeyId] = this.awsId;
    params[RSH.kAWSSecretKey] = this.awsSecret;
    params[RSH.kEndPoint] = this.endPoint;
    this.signatureHelper = new RSH(params);
  }
  return this.signatureHelper;
};

OperationHelper.prototype.generateParams = function (operation, params) {
  params.Service = OperationHelper.service;
  params.Version = OperationHelper.version;
  params.Operation = operation;
  params.AWSAccessKeyId = this.awsId;
  params.AssociateTag = this.assocId;
  return params;
};

OperationHelper.prototype.generateUri = function (operation, params) {
  params = this.generateParams(operation, params);
  const helper = this.getSignatureHelper();
  params = helper.sign(params);
  const queryString = helper.canonicalize(params);
  const uri = `${this.baseUri}?${queryString}`;
  return uri;
};

OperationHelper.prototype.execute = function (operation, params, callback) {
  if (typeof (operation) === 'undefined') { throw 'Missing operation parameter'; }
  if (typeof (params) === 'undefined') { params = {}; }

  const uri = this.generateUri(operation, params);
  const host = this.endPoint;
  const xml2jsOptions = this.xml2jsOptions;

  const options = {
    hostname: host,
    path: uri,
    method: 'GET',
  };

  let responseBody = '';

  const request = http.request(options, (response) => {
    response.setEncoding('utf8');

    response.on('data', (chunk) => {
      responseBody += chunk;
    });

    response.on('end', () => {
      xml2js.parseString(responseBody, xml2jsOptions, (err, result) => {
        callback(err, result, responseBody);
      });
    });
  });

  request.on('error', (err) => {
    callback(err);
  });

  request.end();
};

exports.OperationHelper = OperationHelper;
