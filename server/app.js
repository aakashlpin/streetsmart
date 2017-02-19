'use strict';

require('newrelic');

var express = require('express'),
    mongoose = require('mongoose'),
    fs = require('fs'),
    config = require('./config/config');

mongoose.Promise = global.Promise;
mongoose.connect(config.db);
var db = mongoose.connection;
db.on('error', function () {
    throw new Error('unable to connect to database at ' + config.db);
});

var modelsPath = __dirname + '/app/models';
fs.readdirSync(modelsPath).forEach(function (file) {
    if (file.indexOf('.js') >= 0) {
        require(modelsPath + '/' + file);
    }
});

var jobs = require('./app/controllers/jobs');
jobs.init();

var app = express();
require('./config/express')(app, config);
require('./config/routes')(app);
require('./auth');

app.listen(config.port);
console.log(config.app.name + ' running ');
