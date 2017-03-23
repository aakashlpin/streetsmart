const path = require('path');

const rootPath = path.normalize(`${__dirname}/..`);

const config = {
  root: rootPath,
  app: {
    name: 'Cheapass India',
  },
  sellers: {
    flipkart: {
      name: 'Flipkart',
      url: 'flipkart.com',
      cronKey: 'FLIPKART',
      proxyKey: 'FLIPKART_PROXY',
      key: 'affid',
      value: 'aakashlpi',
      requiresUserAgent: true,
      requiresCookies: false,
      hasDeepLinking: true,
      requiresProxy: true,
      hasMicroService: true,
      isCronActive: true,
      concurrency: 2,
    },
    amazon: {
      name: 'Amazon.in',
      url: 'amazon.in',
      cronKey: 'AMAZON_IN',
      proxyKey: 'AMAZON_PROXY',
      key: 'tag',
      value: 'cheapass0a-21',
      requiresUserAgent: true,
      requiresCookies: false,
      hasProductAPI: false,
      hasDeepLinking: true,
      requiresProxy: true,
      isCronActive: false,
    },
    amazonSlow: {
      name: 'Amazon.in',
      url: 'amazon.in',
      cronKey: 'AMAZON_IN_SLOW',
      key: 'tag',
      value: 'caslow-21',
      requiresUserAgent: true,
      requiresCookies: false,
      hasProductAPI: false,
      hasDeepLinking: true,
      requiresProxy: true,
      isCronActive: true,
      concurrency: 1,
      keepSlow: true,
    },
    healthkart: {
      name: 'HealthKart',
      url: 'healthkart.com',
      cronKey: 'HEALTHKART',
      key: null,
      value: null,
      requiresUserAgent: false,
      hasProductAPI: false,
      isCronActive: true,
    },
    zivame: {
      name: 'Zivame',
      url: 'zivame.com',
      cronKey: 'ZIVAME',
      key: null,
      value: null,
      requiresUserAgent: false,
      hasProductAPI: false,
      isCronActive: true,
    },
    jabong: {
      name: 'Jabong',
      url: 'jabong.com',
      cronKey: 'JABONG',
      otherUrls: ['jbo.ng'],
      key: null,
      value: null,
      requiresCookies: true,
      requiresUserAgent: true,
      isCronActive: true,
    },
    fabfurnish: {
      name: 'FabFurnish',
      url: 'fabfurnish.com',
      cronKey: 'FABFURNISH',
      key: null,
      value: null,
      requiresUserAgent: false,
      isCronActive: true,
    },
    infibeam: {
      name: 'Infibeam',
      url: 'infibeam.com',
      cronKey: 'INFIBEAM',
      key: 'trackId',
      value: 'aaka',
      requiresUserAgent: false,
      isCronActive: true,
    },
    snapdeal: {
      name: 'Snapdeal',
      url: 'snapdeal.com',
      cronKey: 'SNAPDEAL',
      key: 'aff_id',
      value: '12129',
      extraParams: '&utm_source=aff_prog&utm_campaign=afts&offer_id=17',
      requiresUserAgent: true,
      hasDeepLinking: true,
      isCronActive: true,
    },
  },
};

module.exports = config;
