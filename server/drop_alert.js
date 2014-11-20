'use strict';

var emails = require('./app/controllers/emails');
emails.sendNotifier({
	email: 'aakashlpin@gmail.com'
}, {
	seller: 'amazon',
	productName: 'Apple iPhone 5s',
	productURL: 'https://amazon.in/productURL',
	productImage: 'http://img6a.flixcart.com/image/mobile/z/h/f/apple-iphone-5s-400x400-imadpppc54zfpj9c.jpeg',
	currentPrice: 36999,
	storedPrice: 42999,
	deal: {
		dealUrl: 'http://amazon.in/dealURL',
		dealImage: 'http://cheapass-india.s3.amazonaws.com/ss_amazon_1416235156829.png'
	}

}, function (err, done) {
	// body...
	console.log(err, done);
});