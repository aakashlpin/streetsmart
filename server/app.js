require('newrelic');

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const config = require('./config/config');
const logger = require('./logger').logger;

mongoose.Promise = global.Promise;
mongoose.connect(process.env.DB_CONNECTION, {
  server: {
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000,
  },
});
const db = mongoose.connection;
db.on('error', () => {
  throw new Error(`unable to connect to database at ${process.env.DB_CONNECTION}`);
});

const modelsPath = `${__dirname}/app/models`;
fs.readdirSync(modelsPath).forEach((file) => {
  if (file.indexOf('.js') >= 0) {
    require(`${modelsPath}/${file}`);
  }
});

require('./app/startup');

const app = express();
require('./config/express')(app, config);
require('./config/routes')(app);
require('./auth');

app.listen(process.env.PORT);
logger.log(`${config.app.name} running `);
