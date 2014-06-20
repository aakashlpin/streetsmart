var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'streetsmart'
    },
    port: 3000,
    db: 'mongodb://localhost/streetsmart-development',
    requestTimeout: 1*60*1000    //1 minute
  },

  test: {
    root: rootPath,
    app: {
      name: 'streetsmart'
    },
    port: 3000,
    db: 'mongodb://localhost/streetsmart-test',
    requestTimeout: 1*60*1000    //1 minute
  },

  production: {
    root: rootPath,
    app: {
      name: 'streetsmart'
    },
    port: 3000,
    db: 'mongodb://localhost/streetsmart-production',
    requestTimeout: 30*60*1000    //30 minutes
  }
};

module.exports = config[env];
