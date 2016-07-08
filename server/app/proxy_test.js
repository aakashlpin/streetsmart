var request = require('request');
var fs = require('fs');

request({
  url: 'http://www.amazon.in/Samsung-FH4003-inches-Ready-Black/dp/B00URFD45G',
  proxy: 'http://e8ed50e08e444e22a3f13b546196a2c7:@proxy.crawlera.com:8010',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36'
  }
}, function (error, response, body) {
  console.log(response.statusCode);
  fs.writeFileSync('content.html', body);
})
