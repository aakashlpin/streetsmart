const request = require('request');
const parser = require('cheerio');
const config = require('../../config/config');
const amazonScraper = require('../sellers/amazon');
const flipkartScraper = require('../sellers/flipkart');
const fabfurnishScraper = require('../sellers/fabfurnish');
const healthkartScraper = require('../sellers/healthkart');
const infibeamScraper = require('../sellers/infibeam');
const snapdealScraper = require('../sellers/snapdeal');
const zivameScraper = require('../sellers/zivame');
const myntraScraper = require('../sellers/myntra');
const jabongScraper = require('../sellers/jabong');

const scrapers = {
  amazon: amazonScraper,
  flipkart: flipkartScraper,
  snapdeal: snapdealScraper,
  fabfurnish: fabfurnishScraper,
  healthkart: healthkartScraper,
  infibeam: infibeamScraper,
  zivame: zivameScraper,
  myntra: myntraScraper,
  jabong: jabongScraper,
};

function processUrl({ productURL, seller }, cb) {
  const requestOptions = {
    url: productURL,
    timeout: 10000,
  };

  const sellerConfig = config.sellers[seller];

  const {
    requiresUserAgent,
    requiresCookies,
    requiresProxy,
  } = sellerConfig;

  if (requiresUserAgent) {
    requestOptions.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
    };
  }

  if (requiresCookies) {
    requestOptions.jar = true;
  }

  if (requiresProxy && process.env.PAID_PROXY) {
    requestOptions.proxy = process.env.PAID_PROXY;
  }

  request(requestOptions, (requestError, response, body) => {
    try {
      if (requestError) {
        return cb(requestError);
      }

      if (!response) {
        return cb('No response received from requested page');
      }

      const scrapingError = {
        statusCode: response.statusCode,
      };

      switch (response.statusCode) {
        case 200: {
          const htmlBody = parser.load(body);
          const scrapedData = scrapers[seller](htmlBody);

          if (!scrapedData) {
            scrapingError.error = `Unable to process from ${productURL} `;
            return cb(scrapingError);
          }

          const { name, price, image } = scrapedData || {};
          if (!(name && price)) {
            scrapingError.error = `Unable to extract information from ${productURL} `;
            // fs.writeFileSync(`${seller}_${+new Date()}.html`, body);
            return cb(scrapingError);
          }

          return cb(null, {
            productName: name,
            productImage: image,
            productPrice: Number(price),
          });
        }

        case 404: {
          scrapingError.error = `Page 404ed ${productURL} `;
          return cb(scrapingError, null);
        }

        default: {
          scrapingError.error = `Something shouldn't have happened at ${productURL} `;
          return cb(scrapingError);
        }
      }
    } catch (e) {
      return cb({
        error: e,
      }, null);
    }
  });
}

module.exports = processUrl;
