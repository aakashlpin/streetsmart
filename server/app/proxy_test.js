var request = require('request');

request({
  url: 'http://www.amazon.in/Samsung-FH4003-inches-Ready-Black/dp/B00URFD45G',
  proxy: 'http://e8ed50e08e444e22a3f13b546196a2c7:@proxy.crawlera.com:8010'
}, function (error, response, body) {
  console.log(response.statusCode);
  console.log(body);
})
