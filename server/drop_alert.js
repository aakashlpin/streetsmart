'use strict';

var emails = require('./app/controllers/emails');
emails.sendNotifier({
	email: 'aakash@cheapass.in'
}, {
	seller: 'amazon',
	productName: 'Apple iPhone 5s',
	productURL: 'https://amazon.in/productURL',
	productImage: 'http://img6a.flixcart.com/image/mobile/z/h/f/apple-iphone-5s-400x400-imadpppc54zfpj9c.jpeg',
	currentPrice: 36999,
	storedPrice: 42999,
	deal: {
		url: 'http://amazon.in/dealURL',
		image: 'http://cheapass-india.s3.amazonaws.com/ss_amazon_1415973055013.png'
	}

}, function (err, done) {
	// body...
	console.log(err, done);
});