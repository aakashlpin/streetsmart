/* global _ */
'use strict';
(function($) {
	//stub out some ajax requests
	$.mockjax({
		url: '/inputurl',
		contentType: 'text/json',
		responseTime: 2000,
		responseText: {
			name: 'Apple iPhone 5S',
			image: 'http://img5a.flixcart.com/image/mobile/z/h/f/apple-iphone-5s-400x400-imadpppc54zfpj9c.jpeg',
			price: 45940,
			time: new Date()
		}
	});

	//this request on server side should do these things in order
	//1. Check if the email is verified on server
	//  1.1. if step 1 is false => Send out an email verification request
	//  1.2. if step 1 is true => Queue the request for processing. Limit to 3?
	$.mockjax({
		url: '/queue',
		contentType: 'text/json',
		responseTime: 1000,
		responseText: {
			status: 'Sweet! We\'ll keep you posted as the price changes.'
		}
	});

	$.mockjax({
		url: '/stats',
		contentType: 'text/json',
		responseTime: 3,
		responseText: {
			emailsSent: 16756
		}
	});

})(jQuery);

/* POLYFILL */
(function templatePolyfill(d) {
	if('content' in d.createElement('template')) {
		return false;
	}

	var qPlates = d.getElementsByTagName('template'),
		plateLen = qPlates.length,
		elPlate,
		qContent,
		contentLen,
		docContent;

	for(var x=0; x<plateLen; ++x) {
		elPlate = qPlates[x];
		qContent = elPlate.childNodes;
		contentLen = qContent.length;
		docContent = d.createDocumentFragment();

		while(qContent[0]) {
			docContent.appendChild(qContent[0]);
		}

		elPlate.content = docContent;
	}
})(document);

(function(window, $) {
	window.odometerOptions = {
	  auto: true, // Don't automatically initialize everything with class 'odometer'
	  selector: '#ca-counters-emails', // Change the selector used to automatically find things to be animated
	  format: '(,ddd).dd', // Change how digit groups are formatted, and how many digits are shown after the decimal point
	  // duration: 1000, // Change how long the javascript expects the CSS animation to take
	  // theme: 'car', // Specify the theme (if you have more than one theme css file on the page)
	  animation: 'count' // Count is a simpler animation method which just increments the value,
						 // use it when you're looking for something more subtle.
	};

	var urlForm = {
		$el: $('#fkURLForm'),
		$inputEl: $('#productPageURL'),
		oldURL: null,
		sellers: ['flipkart.com', 'amazon.in', 'infibeam.com', 'bajaao.com',
		'jabong.com', 'myntra.com', 'pepperfry.com', 'snapdeal.com',
		'fabfurnish.com'],
		isLegitSeller: function(url) {
			var sellers = urlForm.sellers;
			return !!_.find(sellers, function(seller) {
				return url.indexOf(seller) >= 0;
			});
		},
		handleURLInputClick: function(e) {
			$(e.target).select();
		},
		handleURLInputPaste: function(evt) {
			var tmpl, clone;
			function process() {
				//setTimeout is necessary to ensure that the content actually gets pasted
				var url = $.trim(urlForm.$inputEl.val());
				var responseContainer = document.querySelector('#response-container');

				if (!urlForm.isLegitSeller(url)) {
					tmpl = document.querySelector('#illegalSeller');
					clone = document.importNode(tmpl.content, true);
					responseContainer.innerHTML = '';
					responseContainer.appendChild(clone);
				}

				if (urlForm.isLegitSeller(url) && (url !== urlForm.oldURL)) {
					//using oldURL as a previously entered whatever
					urlForm.oldURL = url;
					urlForm.$inputEl.attr('disabled', 'disabled');
					tmpl = document.querySelector('#loader');
					clone = document.importNode(tmpl.content, true);
					responseContainer.innerHTML = '';
					responseContainer.appendChild(clone);

					$.getJSON('/inputurl', {url: url}, function(res) {
						if (!res.productPrice) {
							// if (supportsTemplate()) {
							tmpl = document.querySelector('#illegalProductPage');
							clone = document.importNode(tmpl.content, true);
							responseContainer.innerHTML = '';
							responseContainer.appendChild(clone);
							urlForm.$inputEl.removeAttr('disabled').click();
							// }
							return;
						}

						urlForm.$inputEl.removeAttr('disabled');
						var priceVal = res.productPrice,
						nameVal = res.productTitle,
						imageVal = res.productImage;

						tmpl = document.querySelector('#tmplNotifyMe');
						var tmplContent = tmpl.content;
						var titleDOM = tmplContent.querySelector('#product-title');
						var priceDOM = tmplContent.querySelector('#product-price');
						var imageDOM = tmplContent.querySelector('#product-image');
						var productURLDOM = tmplContent.querySelector('#productURL');
						var productPriceDOM = tmplContent.querySelector('#currentPrice');
						var productNameDOM = tmplContent.querySelector('#productName');
						var productImageDOM = tmplContent.querySelector('#productImage');

						titleDOM.textContent = nameVal;
						priceDOM.textContent = priceVal;
						imageDOM.src = imageVal;
						imageDOM.alt = nameVal;

						//hidden input fields
						productURLDOM.value = url;
						productNameDOM.value = nameVal;
						productPriceDOM.value = priceVal;
						productImageDOM.value = imageVal;

						//clone this new template and put it in response container
						clone = document.importNode(tmpl.content, true);
						responseContainer.innerHTML = '';
						responseContainer.appendChild(clone);

						var inputEmailClonedDOM = $('#inputEmail');
						if ('localStorage' in window) {
							var userEmail = localStorage.getItem('userEmail');
							if (userEmail) {
								inputEmailClonedDOM.val(userEmail);
							}
						}

						inputEmailClonedDOM.focus();

						//bind the event here
						$(FinalSubmissionForm.el).on('submit', FinalSubmissionForm.handleFormSubmit);
						$(FinalSubmissionForm.reloadBtn).on('click', FinalSubmissionForm.resetState);

					});
				}
			}

			if (evt.type === 'submit') {
				evt.preventDefault();
				process.call(this);
			} else {
				setTimeout(process.bind(this), 0);
			}
		}
	};


	var FinalSubmissionForm = {
		el: '#fkSubmissionForm',
		reloadBtn: '#reloadBtn',
		handleFormSubmit: function(e) {
			e.preventDefault();
			var payload = $(this).serialize();
			var inputEmailDOM = $('#inputEmail');
			var submitBtn = $('#submitBtn');
			var reloadBtn = $('#reloadBtn');
			var messageContainer = $('#queueResponse');
			var email = inputEmailDOM.val();
			submitBtn.attr('disabled', 'disabled');
			FinalSubmissionForm.saveEmailLocally(email);
			$.getJSON('/queue', payload, function(res) {
				var message = res.status;
				inputEmailDOM.attr('disabled', 'disabled');
				submitBtn.hide();
				reloadBtn.removeClass('hide');
				messageContainer.removeClass('hide').hide().find('.js-queue-response').html(message).end().fadeIn();
			});
		},
		saveEmailLocally: function(email) {
			if ('localStorage' in window) {
				localStorage.setItem('userEmail', email);
			}
		},
		resetState: function(e) {
			e.preventDefault();
			location.reload();
		}
	};

	var Counters = {
		// $usersCount: $('#ca-counters-users'),
		// $itemsCount: $('#ca-counters-products'),
		$emailsCount: $('#ca-counters-emails'),
		init: function() {
			$.getJSON('/stats', function(res) {
				// Counters.$usersCount.html(res.totalUsers);
				// Counters.$itemsCount.html(res.itemsTracked);
				Counters.$emailsCount.html(res.emailsSent);
			});
		}
	};

	var LandingBackground = {
		$el: $('.landing-image'),
		imgSrc: '../img/cover3.jpg',
		init: function () {
			var bgImg = new Image();
			bgImg.onload = function(){
			   LandingBackground.$el.css({
					'background-image': 'url(' + bgImg.src + ')'
			   })
			   .addClass('animated fadeIn');
			};
			bgImg.src = LandingBackground.imgSrc;
		}
	};

	var ProductTracks = {
		$el: $('#product-tracks'),
		data: [
		  {
		    "__v": 0,
		    "_id": "5433870387adc5161cce89d2",
		    "currentPrice": 35990,
		    "productImage": "http://img6a.flixcart.com/image/camera/s/h/y/nikon-d5200-slr-400x400-imadf4ghtt4hv5qz.jpeg",
		    "productName": "Nikon D5200 DSLR Camera",
		    "productURL": "http://www.flipkart.com/dl/nikon-d5200-dslr-camera/p/itmdxsprudh7bbr8?pid=CAMDF4FHEHKYNSHY&affid=aakashlpi",
		    "eyes": 3,
		    "seller": "flipkart",
		    "ltp": 32699
		  },
		  {
		    "__v": 0,
		    "_id": "542fc0983e8fe3a71216ded1",
		    "currentPrice": 31999,
		    "productImage": "http://img5a.flixcart.com/image/mobile/w/q/h/motorola-xt1092-400x400-imadzqtcxbfkenfn.jpeg",
		    "productName": "Moto X (2nd Gen)",
		    "productURL": "http://www.flipkart.com/dl/moto-x-2nd-gen/p/itmdzu9exd9vhfvu?pid=MOBDZ3FVVZT38WQH&affid=aakashlpi",
		    "eyes": 3,
		    "seller": "flipkart",
		    "ltp": 31999
		  },
		  {
		    "__v": 0,
		    "_id": "53ed079ba681d76555b51189",
		    "currentPrice": 40550,
		    "productImage": "http://img6a.flixcart.com/image/mobile/4/u/g/apple-iphone-5s-400x400-imadpppc9k3gzdjz.jpeg",
		    "productName": "Apple iPhone 5S",
		    "productURL": "http://www.flipkart.com/dl/apple-iphone-5s/p/itmdv6f75dyxhmt4?affid=aakashlpi",
		    "eyes": 3,
		    "seller": "flipkart",
		    "ltp": 31999
		  },
		  {
		    "__v": 0,
		    "_id": "53d09d589d5473d05d00000f",
		    "currentPrice": 34990,
		    "productImage": "http://img5a.flixcart.com/image/camera/a/f/f/canon-eos-600d-slr-400x400-imacxmkadztwg5rz.jpeg",
		    "productName": "Canon EOS 600D DSLR Camera",
		    "productURL": "http://www.flipkart.com/dl/canon-eos-600d-dslr-camera/p/itmdv58gzf2hxbgd?pid=CAMCWKZSTUFK5AFF&affid=aakashlpi",
		    "eyes": 3,
		    "seller": "flipkart",
		    "ltp": 28500
		  },
		  {
		    "__v": 0,
		    "_id": "53b91a1bc505331064000015",
		    "alertFromPrice": 8000,
		    "alertToPrice": 7500,
		    "currentPrice": 7500,
		    "productImage": "http://img6a.flixcart.com/image/lens/prime/h/d/f/nikon-standard-af-s-nikkor-50mm-f-1-8g-400x400-imady4t42jpv9tvt.jpeg",
		    "productName": "Nikon AF-S NIKKOR 50mm f/1.8G Lens",
		    "productURL": "http://www.flipkart.com/dl/nikon-af-s-nikkor-50mm-f-1-8g-lens/p/itmcyh98azh5whdf?pid=ACCCYH98AZH5WHDF&affid=aakashlpi",
		    "eyes": 3,
		    "seller": "flipkart",
		    "ltp": 7091
		  },
		  {
		    "__v": 0,
		    "_id": "5433a46c87adc5161cce89e7",
		    "currentPrice": 2949,
		    "productImage": "http://ecx.images-amazon.com/images/I/41xuAPS2vbL._SY300_.jpg",
		    "productName": "Philips AquaTouch AT890/16 Men's Shaver",
		    "productURL": "http://www.amazon.in/dp/B009H0B8FU?tag=cheapass0a-21",
		    "eyes": 3,
		    "seller": "amazon",
		    "ltp": 2889
		  },
		  {
		    "__v": 0,
		    "_id": "5432900212678c1757c63e80",
		    "alertFromPrice": 66300,
		    "alertToPrice": 56695,
		    "currentPrice": 66300,
		    "productImage": "http://ecx.images-amazon.com/images/I/31QDmTGMlnL._SX300_.jpg",
		    "productName": "Apple MacBook Air 13-inch Laptop - MD760HN/B",
		    "productURL": "http://www.amazon.in/dp/B00KMPCCDG?tag=cheapass0a-21",
		    "eyes": 3,
		    "seller": "amazon",
		    "ltp": 49990
		  },
		  {
		    "__v": 0,
		    "_id": "541722b9d59096bb618041b4",
		    "currentPrice": 38000,
		    "productImage": "http://ecx.images-amazon.com/images/I/51v9J5rVnlL._SL500_AA280_.jpg",
		    "productName": "Apple iPhone 5s (Space Grey, 16GB)",
		    "productURL": "http://www.amazon.in/dp/B00FXLC9V4?tag=cheapass0a-21",
		    "eyes": 3,
		    "seller": "amazon",
		    "ltp": 29999
		  },
		  {
		    "__v": 0,
		    "_id": "541722abd59096bb618041b1",
		    "alertFromPrice": 38000,
		    "alertToPrice": 37709,
		    "currentPrice": 37710,
		    "productImage": "http://ecx.images-amazon.com/images/I/51Ywi5j963L._SL500_AA280_.jpg",
		    "productName": "Apple iPhone 5s (Gold, 16GB)",
		    "productURL": "http://www.amazon.in/dp/B00FXLCD38?tag=cheapass0a-21",
		    "eyes": 3,
		    "seller": "amazon",
		    "ltp": 29999
		  },
		  {
		    "__v": 0,
		    "_id": "5432c14512678c1757c63e98",
		    "currentPrice": 9999,
		    "productImage": "http://img6a.flixcart.com/image/speaker/bluetooth-speaker/4/c/b/jbl-pulse-400x400-imadqd4sgv7efdhb.jpeg",
		    "productName": "JBL Pulse Bluetooth Speaker",
		    "productURL": "http://www.flipkart.com/dl/jbl-pulse-bluetooth-speaker/p/itmdqd4ztwd8yq5g?pid=ACCDQD4NR99Z24CB&affid=aakashlpi",
		    "eyes": 2,
		    "seller": "flipkart",
		    "ltp": 9069
		  },
		  {
		    "__v": 0,
		    "_id": "542928e0e29cc9e23d5ff1c0",
		    "currentPrice": 24859,
		    "productImage": "http://img5a.flixcart.com/image/camera/s/4/g/nikon-d3200-kit-with-18-55-mm-vr-lens-slr-400x400-imada6rquvzcspxw.jpeg",
		    "productName": "Nikon D3200 DSLR Camera",
		    "productURL": "http://www.flipkart.com/dl/nikon-d3200-dslr-camera/p/itmdyz8hpwfdydv2?pid=CAMDA6RJERF8HS4G&affid=aakashlpi",
		    "eyes": 2,
		    "seller": "flipkart",
		    "ltp": 23939
		  },
		  {
		    "__v": 0,
		    "_id": "540fda28a34d9755295db26c",
		    "currentPrice": 3000,
		    "productImage": "http://img5a.flixcart.com/image/book/7/5/6/harry-potter-complete-paperback-boxed-set-400x400-imadphyunufzt5yr.jpeg",
		    "productName": "Harry Potter Box Set 2013 (English)",
		    "productURL": "http://www.flipkart.com/dl/harry-potter-box-set-2013-english/p/itmdp2gwge7chfy4?pid=9781408850756&affid=aakashlpi",
		    "eyes": 2,
		    "seller": "flipkart",
		    "ltp": 1200
		  },
		  {
		    "__v": 0,
		    "_id": "54060ffc6f9b38573419ba96",
		    "currentPrice": 119999,
		    "productImage": "http://img5a.flixcart.com/image/computer/d/m/7/apple-macbook-pro-notebook-400x400-imadypaf62ycfhzu.jpeg",
		    "productName": "Apple MGX92HN/A MacBook Pro Notebook (Ci5/ 8GB/ Mac OS X Mavericks)",
		    "productURL": "http://www.flipkart.com/dl/apple-mgx92hn-a-macbook-pro-notebook-ci5-8gb-mac-os-x-mavericks/p/itmdyp9jsfhfuk7k?pid=COMDYP8WSBZGH8ZY&affid=aakashlpi",
		    "eyes": 2,
		    "seller": "flipkart",
		    "ltp": 115590
		  },
		  {
		    "__v": 0,
		    "_id": "540407e32993161723641520",
		    "currentPrice": 17999,
		    "productImage": "http://img6a.flixcart.com/image/mobile/m/t/n/motorola-moto-x-400x400-imadu82xgcr8abck.jpeg",
		    "productName": "Moto X (16 GB)",
		    "productURL": "http://www.flipkart.com/dl/moto-x-16-gb/p/itmdwgffrgc885qt?pid=MOBDSGU27YGJAZNB&affid=aakashlpi",
		    "eyes": 2,
		    "seller": "flipkart",
		    "ltp": 17999
		  },
		  {
		    "__v": 0,
		    "_id": "53f6fd6203e15ba904156e8e",
		    "currentPrice": 8991,
		    "productImage": "http://img5a.flixcart.com/image/fitness-band/c/b/j/garmin-vivofit-400x400-imadyqazsnxmsdz5.jpeg",
		    "productName": "Garmin Vivofit Fitness Band",
		    "productURL": "http://www.flipkart.com/dl/garmin-vivofit-fitness-band/p/itmdyqn2xxmx8mfd?pid=FNBDXTY3GVNQECBJ&affid=aakashlpi",
		    "eyes": 2,
		    "seller": "flipkart",
		    "ltp": 7492
		  },
		  {
		    "__v": 0,
		    "_id": "53ce5e9a36000efe48000009",
		    "currentPrice": 40999,
		    "productImage": "http://img5a.flixcart.com/image/mobile/z/h/f/apple-iphone-5s-400x400-imadpppc54zfpj9c.jpeg",
		    "productName": "Apple iPhone 5S",
		    "productURL": "http://www.flipkart.com/dl/apple-iphone-5s/p/itmdv6f75dyxhmt4?pid=MOBDPPZZPXVDJHSQ&affid=aakashlpi",
		    "eyes": 2,
		    "seller": "flipkart",
		    "ltp": 34999
		  },
		  {
		    "__v": 0,
		    "_id": "53ccb1fed075c1ae34000002",
		    "currentPrice": 28850,
		    "productImage": "http://img6a.flixcart.com/image/tablet/6/a/5/apple-32-gb-ipad-mini-with-retina-display-and-wi-fi-400x400-imadr69cahw4uxgz.jpeg",
		    "productName": "Apple 16 GB iPad Mini with Retina Display and Wi-Fi",
		    "productURL": "http://www.flipkart.com/dl/apple-16-gb-ipad-mini-retina-display-wi-fi/p/itmdxf63rkjdx2mf?pid=TABDR66P3GMFE7QG&affid=aakashlpi",
		    "eyes": 2,
		    "seller": "flipkart",
		    "ltp": 24490
		  },
		  {
		    "__v": 0,
		    "_id": "53b91a1bc50533106400000f",
		    "alertFromPrice": 13999,
		    "alertToPrice": 12900,
		    "currentPrice": 13999,
		    "productImage": "http://img6a.flixcart.com/image/tablet/3/h/r/hp-slate-7-voice-tab-400x400-imadu4x3ahh79yu9.jpeg",
		    "productName": "HP Slate 7 Voice Tab",
		    "productURL": "http://www.flipkart.com/dl/hp-slate-7-voice-tab/p/itmdu4sgzwtcv3hr?pid=TABDU4SGZWTCV3HR&affid=aakashlpi",
		    "eyes": 2,
		    "seller": "flipkart",
		    "ltp": 11499
		  },
		  {
		    "__v": 0,
		    "_id": "5438cb5c9e305cd861ebb591",
		    "currentPrice": 10124,
		    "productImage": "http://ecx.images-amazon.com/images/I/41q2aa28glL._SY300_.jpg",
		    "productName": "Philips Viva Collection HD9220 2.2 Litre Air fryer with Rapid Air Technology (Black)",
		    "productURL": "http://www.amazon.in/dp/B009UOR7KI?tag=cheapass0a-21",
		    "eyes": 2,
		    "seller": "amazon",
		    "ltp": 10124
		  },
		  {
		    "__v": 0,
		    "_id": "5435a36424977d4c11ca29bf",
		    "alertFromPrice": 30790,
		    "alertToPrice": 25145,
		    "currentPrice": 30790,
		    "productImage": "http://ecx.images-amazon.com/images/I/415ImnWikaL._SX300_.jpg",
		    "productName": "Canon EOS 1200D 18MP Digital SLR Camera (Black) with 18-55mm and 55-250mm IS II Lens,8GB card and Carry Bag",
		    "productURL": "http://www.amazon.in/dp/B00JB0IZHU?tag=cheapass0a-21",
		    "eyes": 2,
		    "seller": "amazon",
		    "ltp": 20988
		  },
		  {
		    "__v": 0,
		    "_id": "543535f824977d4c11ca29b1",
		    "currentPrice": 748,
		    "productImage": "http://ecx.images-amazon.com/images/I/31eVFh2YsKL._SY300_.jpg",
		    "productName": "Sennheiser CX 180 Street II In-Ear Headphone (Black)",
		    "productURL": "http://www.amazon.in/dp/B00D75AB6I?tag=cheapass0a-21",
		    "eyes": 2,
		    "seller": "amazon",
		    "ltp": 739
		  },
		  {
		    "__v": 0,
		    "_id": "5433179487adc5161cce89be",
		    "alertFromPrice": 136600,
		    "alertToPrice": 124998,
		    "currentPrice": 124998,
		    "productImage": "http://ecx.images-amazon.com/images/I/31YTw5CpR9L._SX300_.jpg",
		    "productName": "Apple MacBook Pro MGXA2HN/A 15-Inch Laptop",
		    "productURL": "http://www.amazon.in/dp/B00MOGJX6K?tag=cheapass0a-21",
		    "eyes": 2,
		    "seller": "amazon",
		    "ltp": 124998
		  },
		  {
		    "__v": 0,
		    "_id": "5433176e87adc5161cce89bc",
		    "alertFromPrice": 175500,
		    "alertToPrice": 144677,
		    "currentPrice": 144677,
		    "productImage": "http://ecx.images-amazon.com/images/I/31YTw5CpR9L._SX300_.jpg",
		    "productName": "Apple MacBook Pro MGXC2HN/A 15-Inch Laptop",
		    "productURL": "http://www.amazon.in/dp/B00MOGJZWC?tag=cheapass0a-21",
		    "eyes": 2,
		    "seller": "amazon",
		    "ltp": 144650
		  },
		  {
		    "__v": 0,
		    "_id": "5432c1ca12678c1757c63e9a",
		    "currentPrice": 67616,
		    "productImage": "http://ecx.images-amazon.com/images/I/41gT05FXHHL._SX300_.jpg",
		    "productName": "Apple MacBook Air 13-inch Laptop - MD761HN/B",
		    "productURL": "http://www.amazon.in/dp/B00KU4LRA8?tag=cheapass0a-21",
		    "eyes": 2,
		    "seller": "amazon",
		    "ltp": 67616
		  },
		  {
		    "__v": 0,
		    "_id": "542928ebe29cc9e23d5ff1c2",
		    "alertFromPrice": 24744,
		    "alertToPrice": 23299,
		    "currentPrice": 23292,
		    "productImage": "http://ecx.images-amazon.com/images/I/41gggAuRCnL._SX300_.jpg",
		    "productName": "Nikon D3200 24.2 MP Digital SLR Camera (Black) with AF-S 18-55mm VR Kit Lens, Memory Card, Camera Bag",
		    "productURL": "http://www.amazon.in/dp/B00JXEL4YA?tag=cheapass0a-21",
		    "eyes": 2,
		    "seller": "amazon",
		    "ltp": 23198
		  },
		  {
		    "__v": 0,
		    "_id": "5424e0fcbc07afd57c8ab273",
		    "currentPrice": 45990,
		    "productImage": "http://ecx.images-amazon.com/images/I/51o1GVTVBYL._SX300_.jpg",
		    "productName": "Xbox One Console with Kinect Day One Edition (Free Games: FIFA 15 DLC, Dance Central Spotlight DLC)",
		    "productURL": "http://www.amazon.in/dp/B00M1D18V4?tag=cheapass0a-21",
		    "eyes": 2,
		    "seller": "amazon",
		    "ltp": 41990
		  },
		  {
		    "__v": 0,
		    "_id": "5433c6fa87adc5161cce89fb",
		    "alertFromPrice": 40919,
		    "alertToPrice": 38363,
		    "currentPrice": 40919,
		    "productImage": "http://n2.sdlcdn.com/imgs/a/j/x/Apple-iPhone-5S-16-GB-SDL218647224-1-a4b59.jpg",
		    "productName": "Apple iPhone 5S 16 GB (Space Grey)Apple iPhone 5S 16 GB (Space Grey)Apple",
		    "productURL": "http://www.snapdeal.com/product/apple-iphone-5s-16-gb/1204769399?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 2,
		    "seller": "snapdeal",
		    "ltp": 37399
		  },
		  {
		    "__v": 0,
		    "_id": "54324dfe12678c1757c63e59",
		    "alertFromPrice": 39214,
		    "alertToPrice": 38499,
		    "currentPrice": 38499,
		    "productImage": "http://n4.sdlcdn.com/imgs/a/j/x/Apple-iPhone-5S-16-GB-SDL218153659-1-d5617.jpg",
		    "productName": "Apple iPhone 5S 16 GB (Gold)Apple",
		    "productURL": "http://www.snapdeal.com/product/apple-iphone-5s-16-gb/1302850866#bcrumbSearch:|bcrumbLabelId:175?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 2,
		    "seller": "snapdeal",
		    "ltp": 34499
		  },
		  {
		    "__v": 0,
		    "_id": "53b91a1dc505331064000026",
		    "currentPrice": 3395,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/Vero-Moda-Women-Blue---Pink-Floral-Print-Blazer_d2dd648f9da36a057bfeadb5cf62a19f_images.JPG",
		    "productName": "Vero Moda Women Blue & Pink Floral Print Blazer",
		    "productURL": "http://www.myntra.com/Blazers/Vero-Moda/Vero-Moda-Women-Blue--Pink-Floral-Print-Blazer/312678/buy",
		    "eyes": 2,
		    "seller": "myntra",
		    "ltp": 1697
		  },
		  {
		    "__v": 0,
		    "_id": "543a8e036815e87c2a8c76e8",
		    "currentPrice": 40550,
		    "productImage": "http://img6a.flixcart.com/image/mobile/4/y/h/apple-iphone-5s-400x400-imadpppch2n6hhux.jpeg",
		    "productName": "Apple iPhone 5S",
		    "productURL": "http://www.flipkart.com/dl/apple-iphone-5s/p/itmdv6f75dyxhmt4?pid=MOBDPPZZVUJRG582&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 40550
		  },
		  {
		    "__v": 0,
		    "_id": "543a74a86815e87c2a8c76e3",
		    "currentPrice": 799,
		    "productImage": "http://img6a.flixcart.com/image/slipper-flip-flop/m/v/h/01-high-risk-red-black-355043-puma-7-400x400-imadt5fbjmdggqzg.jpeg",
		    "productName": "Puma Issac Ind- Flip Flops",
		    "productURL": "http://www.flipkart.com/dl/puma-issac-ind-flip-flops/p/itmdzdyhgyjtcwbb?pid=SFFDZDYAG557NRVD&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 799
		  },
		  {
		    "__v": 0,
		    "_id": "543a1a669b925cde753ee507",
		    "alertFromPrice": 2599,
		    "alertToPrice": 2430,
		    "currentPrice": 2430,
		    "productImage": "http://img6a.flixcart.com/image/memory-card/microsdxc/q/d/u/sandisk-mobile-ultra-64-gb-class-10-400x400-imadq45mfmputzzh.jpeg",
		    "productName": "SanDisk MicroSD Card 64 GB Class 10 Ultra",
		    "productURL": "http://www.flipkart.com/sandisk-microsd-card-64-gb-class-10-ultra/p/itmdawkqqfacznhc?pid=ACCDAWKHYHCKMQDU&srno=b_1&ref=c2394cd7-5540-4aee-b106-806c3eed7b21&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 2430
		  },
		  {
		    "__v": 0,
		    "_id": "5439fc0a9b925cde753ee503",
		    "currentPrice": 2990,
		    "productImage": "http://img6a.flixcart.com/image/t-shirt/f/x/p/78197200-gas-m-400x400-imaeyfgwb9gqudht.jpeg",
		    "productName": "Gas Printed Men's Round Neck T-Shirt",
		    "productURL": "http://www.flipkart.com/dl/gas-printed-men-s-round-neck-t-shirt/p/itmey2xehxzskemc?pid=TSHEY2XCPQ79SHH9&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 2990
		  },
		  {
		    "__v": 0,
		    "_id": "5439e6a29b925cde753ee501",
		    "currentPrice": 2420,
		    "productImage": "http://img6a.flixcart.com/image/memory-card/f/4/h/samsung-mb-mp64d-400x400-imadvjvz8dvjk5zs.jpeg",
		    "productName": "Samsung MicroSDXC 64 GB Class 10 Evo",
		    "productURL": "http://www.flipkart.com/dl/samsung-microsdxc-64-gb-class-10-evo/p/itmdvjmb8tdt7zne?pid=ACCDVJM6PC3YYF4H&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 2410
		  },
		  {
		    "__v": 0,
		    "_id": "5439a88d9b925cde753ee4f2",
		    "currentPrice": 11980,
		    "productImage": "http://img6a.flixcart.com/image/router/e/j/9/tp-link-archer-c7-ac1750-400x400-imadybjhfsksvgpn.jpeg",
		    "productName": "TP-LINK Archer C7 AC1750",
		    "productURL": "http://www.flipkart.com/dl/tp-link-archer-c7-ac1750/p/itmdyap7zwnqthvf?pid=RTRDYAP7VKGZAEJ9&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 11980
		  },
		  {
		    "__v": 0,
		    "_id": "5439a8869b925cde753ee4f0",
		    "currentPrice": 14399,
		    "productImage": "http://img6a.flixcart.com/image/mobile/7/j/j/lg-l70-dual-400x400-imadus47nzg2xjsd.jpeg",
		    "productName": "LG L90 Dual",
		    "productURL": "http://www.flipkart.com/dl/lg-l90-dual/p/itmdus3skegmbvah?pid=MOBDUS3D5URVCMGS&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 14399
		  },
		  {
		    "__v": 0,
		    "_id": "5439a87e9b925cde753ee4ee",
		    "alertFromPrice": 15249,
		    "alertToPrice": 13999,
		    "currentPrice": 13999,
		    "productImage": "http://img6a.flixcart.com/image/mobile/d/a/h/lg-l90-400x400-imadurqkurrfmffv.jpeg",
		    "productName": "LG L90",
		    "productURL": "http://www.flipkart.com/dl/lg-l90/p/itmduhducxydbdah?pid=MOBDUHDUCXYDBDAH&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 13999
		  },
		  {
		    "__v": 0,
		    "_id": "5439a8769b925cde753ee4ec",
		    "currentPrice": 12270,
		    "productImage": "http://img6a.flixcart.com//image/headphone/d/r/a/sennheiser-rs-160-400x400-imad2896vedxcqcp.jpeg",
		    "productName": "Sennheiser RS 160 Wireless Headphones",
		    "productURL": "http://www.flipkart.com/dl/sennheiser-rs-160-wireless-headphones/p/itmczbxhbnwygwyw?pid=ACCCRRRWYDNH4DRA&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 12270
		  },
		  {
		    "__v": 0,
		    "_id": "5439a86e9b925cde753ee4ea",
		    "currentPrice": 2326,
		    "productImage": "http://img5a.flixcart.com/image/datacard/h/a/t/huawei-e8231-400x400-imads6znazw5yjkh.jpeg",
		    "productName": "Huawei E8231 Data Card",
		    "productURL": "http://www.flipkart.com/dl/huawei-e8231-data-card/p/itmds6zgzpdaj8cg?pid=DATDS6ZDRFVJEHAT&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 2326
		  },
		  {
		    "__v": 0,
		    "_id": "543990cb9b925cde753ee4dd",
		    "currentPrice": 2499,
		    "productImage": "http://img5a.flixcart.com/image/av-media/games/e/r/n/wwe-2k15-400x400-imady44fftkzumfk.jpeg",
		    "productName": "WWE 2K15",
		    "productURL": "http://www.flipkart.com/dl/wwe-2k15/p/itmdxh83x5r4nzwh?pid=AVMDXH9JFK8EPERN&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 2499
		  },
		  {
		    "__v": 0,
		    "_id": "5439112e9e305cd861ebb59e",
		    "currentPrice": 2699,
		    "productImage": "http://img5a.flixcart.com/image/shoe/x/x/f/03-blue-white-358494-puma-10-400x400-imadzj8ntrwdtkfz.jpeg",
		    "productName": "Puma Contest Lite Sneakers",
		    "productURL": "http://www.flipkart.com/dl/puma-contest-lite-sneakers/p/itmdyzyp6qmdzbts?pid=SHODYZYFCY84VCYF&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 2699
		  },
		  {
		    "__v": 0,
		    "_id": "543910fb9e305cd861ebb59c",
		    "currentPrice": 1919,
		    "productImage": "http://img6a.flixcart.com/image/shoe/y/f/a/05-white-silver-amazon-186876-puma-10-400x400-imads3gvpdrvzxyg.jpeg",
		    "productName": "Puma Running Shoes",
		    "productURL": "http://www.flipkart.com/dl/puma-running-shoes/p/itmdr88yeadtf5zv?pid=SHODR87ZATFAUYFA&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1919
		  },
		  {
		    "__v": 0,
		    "_id": "5438fa609e305cd861ebb595",
		    "currentPrice": 799,
		    "productImage": "http://img6a.flixcart.com/image/kurti/6/c/r/blk-shrt-tp-abhishti-s-400x400-imaey68yvvgzhdww.jpeg",
		    "productName": "Abhishti Casual Sleeveless Printed Women's Kurti",
		    "productURL": "http://www.flipkart.com/dl/abhishti-casual-sleeveless-printed-women-s-kurti/p/itmdzj623stnf2t4?pid=KRTDZJ62H4GFF4TH&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 799
		  },
		  {
		    "__v": 0,
		    "_id": "5438cb5c9e305cd861ebb590",
		    "currentPrice": 10179,
		    "productImage": "http://img6a.flixcart.com/image/electric-cooker/j/u/6/philips-hd9220-20-2-2-l-air-fryer-hd9220-20-400x400-imadrmhdkn4gvanr.jpeg",
		    "productName": "Philips HD9220/20 2.2 L Air Fryer",
		    "productURL": "http://www.flipkart.com/dl/philips-hd9220-20-2-2-l-air-fryer/p/itmdzrw88ebkudzy?pid=ECKDBZ2GKECQXJU6&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 10179
		  },
		  {
		    "__v": 0,
		    "_id": "5437653c9e305cd861ebb55b",
		    "currentPrice": 40449,
		    "productImage": "http://img6a.flixcart.com/image/camera/x/z/m/nikon-d3300-with-af-s-18-55-mm-vr-kit-lens-ii-af-s-55-200-mm-vr-400x400-imadv9z4nyxptq2y.jpeg",
		    "productName": "Nikon D3300 with AF-S 18-55 mm VR Kit Lens II + AF-S 55-200 mm VR Kit DSLR Camera",
		    "productURL": "http://www.flipkart.com/dl/nikon-d3300-af-s-18-55-mm-vr-kit-lens-ii-55-200-dslr-camera/p/itmdu5x4gsga6xzm?pid=CAMDU5X4GSGA6XZM&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 37358
		  },
		  {
		    "__v": 0,
		    "_id": "543757a79e305cd861ebb557",
		    "currentPrice": 6990,
		    "productImage": "http://img5a.flixcart.com/image/microwave-new/p/y/k/onida-mo20cjp27b-400x400-imadwsyywp4ryt7g.jpeg",
		    "productName": "Onida MO20CJP27B 20 L Convection Microwave Oven",
		    "productURL": "http://www.flipkart.com/dl/onida-mo20cjp27b-20-l-convection-microwave-oven/p/itmdwdmnrtpza24y?pid=MRCDWBZX947YFPYK&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 6990
		  },
		  {
		    "__v": 0,
		    "_id": "5436d0b39e305cd861ebb54b",
		    "alertFromPrice": 30990,
		    "alertToPrice": 29009,
		    "currentPrice": 31490,
		    "productImage": "http://img6a.flixcart.com/image/camera/k/q/x/nikon-d3300-with-af-s-18-55-mm-vr-kit-lens-with-af-s-18-55-mm-vr-400x400-imadsqghdzhqq2bm.jpeg",
		    "productName": "Nikon D3300 DSLR Camera",
		    "productURL": "http://www.flipkart.com/dl/nikon-d3300-dslr-camera/p/itmdsqgbwfpw8kqx?pid=CAMDSQGBWFPW8KQX&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 27143
		  },
		  {
		    "__v": 0,
		    "_id": "5436b9f19e305cd861ebb543",
		    "currentPrice": 22796,
		    "productImage": "http://img5a.flixcart.com/image/mobile/f/f/f/htc-desire-816-400x400-imadw3ykpkzn2e2a.jpeg",
		    "productName": "HTC Desire 816",
		    "productURL": "http://www.flipkart.com/dl/htc-desire-816/p/itmdwgcegvq22g3b?pid=MOBDW3XDF277SFFF&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 21349
		  },
		  {
		    "__v": 0,
		    "_id": "543678169e305cd861ebb53f",
		    "currentPrice": 5750,
		    "productImage": "http://img6a.flixcart.com/image/headset/7/j/t/jabra-sport-plus-400x400-imadqdbeynyh8zng.jpeg",
		    "productName": "Jabra Sport Plus In-the-ear Headset",
		    "productURL": "http://www.flipkart.com/dl/jabra-sport-plus-in-the-ear-headset/p/itmdqdajnajqa8ew?pid=ACCDQDAJ8CGVQ7JT&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 5750
		  },
		  {
		    "__v": 0,
		    "_id": "54365fdf24977d4c11ca29de",
		    "currentPrice": 1679,
		    "productImage": "http://img5a.flixcart.com/image/shoe/p/9/s/black-silver-187624-puma-9-400x400-imadwdtcnhyvxa9y.jpeg",
		    "productName": "Puma Running Shoes",
		    "productURL": "http://www.flipkart.com/dl/puma-running-shoes/p/itmdyazenfy8xfm3?pid=SHODVZ42UFERSZYK&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1679
		  },
		  {
		    "__v": 0,
		    "_id": "543659c524977d4c11ca29dc",
		    "currentPrice": 1695,
		    "productImage": "http://img6a.flixcart.com/image/duffel-bag/5/n/r/wildcraft-duffel-bag-aqua-small-400x400-imadrqzk9gtw5mrf.jpeg",
		    "productName": "Wildcraft Aqua Small 24 inch Travel Duffel Bag",
		    "productURL": "http://www.flipkart.com/dl/wildcraft-aqua-small-24-inch-travel-duffel-bag/p/itmdxn6xhhzzgcj5?pid=DFBD8YTZEECGD5NR&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1695
		  },
		  {
		    "__v": 0,
		    "_id": "543659b124977d4c11ca29da",
		    "currentPrice": 1999,
		    "productImage": "http://img5a.flixcart.com/image/duffel-bag/h/z/g/7257502-puma-travel-duffel-bag-fundamentals-sports-400x400-imaeyfyqwqwkfmvy.jpeg",
		    "productName": "Puma Fundamentals Sports 24 inch Gym Bag",
		    "productURL": "http://www.flipkart.com/dl/puma-fundamentals-sports-24-inch-gym-bag/p/itmdz6tywxvsdftd?pid=DFBDZ5PHHM3DGHZG&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1999
		  },
		  {
		    "__v": 0,
		    "_id": "54361ecc24977d4c11ca29c8",
		    "currentPrice": 1700,
		    "productImage": "http://img5a.flixcart.com/image/cases-covers/j/g/u/motorola-asmxtfdrtrq-mlti0a-400x400-imadzsy8m6dztwez.jpeg",
		    "productName": "Moto Flip Cover for Moto G (2nd Gen)",
		    "productURL": "http://www.flipkart.com/dl/moto-flip-cover-g-2nd-gen/p/itmdygcbrgdrarya?pid=ACCDYGBWZGGEGJGU&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1700
		  },
		  {
		    "__v": 0,
		    "_id": "543603da24977d4c11ca29c6",
		    "currentPrice": 7990,
		    "productImage": "http://img6a.flixcart.com/image/electric-cooker/b/h/g/kenstar-of-koa15cj3-400x400-imaeykpq7zaphtxz.jpeg",
		    "productName": "Kenstar Oxy Fryer",
		    "productURL": "http://www.flipkart.com/dl/kenstar-oxy-fryer/p/itmeyfsb7x3trgb3?pid=ECKEYFS8YQZHVBHG&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 7990
		  },
		  {
		    "__v": 0,
		    "_id": "5435a72324977d4c11ca29c4",
		    "currentPrice": 35190,
		    "productImage": "http://img5a.flixcart.com/image/remote-control-toy/t/y/f/parrot-ar-drone-2-0-elite-edition-quadricopter-snow-by-flipper-400x400-imadudeg54z2fgam.jpeg",
		    "productName": "Parrot AR.Drone 2.0 Elite Edition Quadricopter Snow - By Flipper",
		    "productURL": "http://www.flipkart.com/dl/parrot-ar-drone-2-0-elite-quadricopter-snow-flipper/p/itmdua3eh6u6ftyf?pid=RCTDUA3EH6U6FTYF&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 35190
		  },
		  {
		    "__v": 0,
		    "_id": "5435a71924977d4c11ca29c2",
		    "currentPrice": 33990,
		    "productImage": "http://img6a.flixcart.com/image/remote-control-toy/h/w/c/parrot-ar-drone-2-0-400x400-imaddkq9gyc4prfa.jpeg",
		    "productName": "Parrot AR Drone 2.0",
		    "productURL": "http://www.flipkart.com/dl/parrot-ar-drone-2-0/p/itmddjf4u6ftyzas?pid=RCTDDJYXHGJD3HWC&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 33990
		  },
		  {
		    "__v": 0,
		    "_id": "5435364224977d4c11ca29b3",
		    "currentPrice": 990,
		    "productImage": "http://img5a.flixcart.com/image/headphone/q/f/3/sennheiser-cx-180-400x400-imadawbthuuzvqpz.jpeg",
		    "productName": "Sennheiser CX 180 In-ear-canalphone",
		    "productURL": "http://www.flipkart.com/dl/sennheiser-cx-180-in-ear-canalphone/p/itmdaw7pjkbfrhha?pid=ACCDAW7PJXCC9QF3&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 790
		  },
		  {
		    "__v": 0,
		    "_id": "543511d224977d4c11ca29af",
		    "currentPrice": 4799,
		    "productImage": "http://img6a.flixcart.com/image/external-hard-drive/x/z/k/wd-passport-ultra-400x400-imadqgvgbgk6q8zq.jpeg",
		    "productName": "WD My Passport Ultra 2.5 inch 1 TB External Hard Drive",
		    "productURL": "http://www.flipkart.com/dl/wd-my-passport-ultra-2-5-inch-1-tb-external-hard-drive/p/itmdqgvabhngtzyv?pid=ACCDQGVA2SWVFGCG&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 4525
		  },
		  {
		    "__v": 0,
		    "_id": "54350a3524977d4c11ca29ac",
		    "currentPrice": 2699,
		    "productImage": "http://img6a.flixcart.com/image/shoe/9/t/z/02-black-blue-aster-dandelion-358541-puma-9-400x400-imadzdgbhmzspuzr.jpeg",
		    "productName": "Puma 917 Mid 2.0 Ind. Sneakers",
		    "productURL": "http://www.flipkart.com/dl/puma-917-mid-2-0-ind-sneakers/p/itmdynwnza5rr9vy?pid=SHODYNWNXGMR2QSH&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 2699
		  },
		  {
		    "__v": 0,
		    "_id": "5434fee724977d4c11ca299b",
		    "currentPrice": 163400,
		    "productImage": "http://img6a.flixcart.com/image/computer/n/z/4/apple-macbook-pro-notebook-400x400-imadypafz6a3cbbd.jpeg",
		    "productName": "Apple MGXC2HN/A MacBook Pro Notebook (Ci7/ 16GB/ Mac OS X Mavericks/ 2GB Graph)",
		    "productURL": "http://www.flipkart.com/dl/apple-mgxc2hn-a-macbook-pro-notebook-ci7-16gb-mac-os-x-mavericks-2gb-graph/p/itmdyp9jzqb6suhx?pid=COMDYP8W2BUYK8HF&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 163400
		  },
		  {
		    "__v": 0,
		    "_id": "5434fec524977d4c11ca2999",
		    "currentPrice": 97999,
		    "productImage": "http://img5a.flixcart.com/image/computer/d/m/7/apple-macbook-pro-notebook-400x400-imadypaf62ycfhzu.jpeg",
		    "productName": "Apple MGX82HN/A MacBook Pro Notebook (Ci5/ 8GB/ Mac OS X Mavericks)",
		    "productURL": "http://www.flipkart.com/dl/apple-mgx82hn-a-macbook-pro-notebook-ci5-8gb-mac-os-x-mavericks/p/itmdyp9j4szfjz8c?pid=COMDYP8W5VKW2SXB&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 97999
		  },
		  {
		    "__v": 0,
		    "_id": "5434fe1724977d4c11ca2997",
		    "currentPrice": 85980,
		    "productImage": "http://img5a.flixcart.com/image/computer/d/m/7/apple-macbook-pro-notebook-400x400-imadypaf62ycfhzu.jpeg",
		    "productName": "Apple MGX72HN/A MacBook Pro Notebook (Ci5/ 8GB/ Mac OS X Mavericks)",
		    "productURL": "http://www.flipkart.com/dl/apple-mgx72hn-a-macbook-pro-notebook-ci5-8gb-mac-os-x-mavericks/p/itmdyp9jznwen9y6?pid=COMDYP8WZZCJZDM7&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 85980
		  },
		  {
		    "__v": 0,
		    "_id": "5434fe1724977d4c11ca2996",
		    "currentPrice": 131589,
		    "productImage": "http://img6a.flixcart.com/image/computer/n/z/4/apple-macbook-pro-notebook-400x400-imadypafz6a3cbbd.jpeg",
		    "productName": "Apple MGXA2HN/A MacBook Pro Notebook (Ci7/ 16GB/ Mac OS X Mavericks)",
		    "productURL": "http://www.flipkart.com/dl/apple-mgxa2hn-a-macbook-pro-notebook-ci7-16gb-mac-os-x-mavericks/p/itmdyp9jj8zzzeds?pid=COMDYP8WHA4GVNZ4&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 131290
		  },
		  {
		    "__v": 0,
		    "_id": "543495cbe4bbf13d5efba8ae",
		    "currentPrice": 1205,
		    "productImage": "http://img5a.flixcart.com/image/pot-pan/q/k/h/30806-prestige-400x400-imadw6uzu4am8khr.jpeg",
		    "productName": "Prestige Omega Diecast Plus Casserole 200 mm",
		    "productURL": "http://www.flipkart.com/dl/prestige-omega-diecast-plus-casserole-200-mm/p/itmdw567ez3qztt5?pid=PTPDW565CEGQNQKH&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1199
		  },
		  {
		    "__v": 0,
		    "_id": "5434305de4bbf13d5efba8aa",
		    "currentPrice": 1124,
		    "productImage": "http://img6a.flixcart.com/image/bedsheet/r/k/g/soid-10402-swayam-400x400-imadmg6yzthwnggu.jpeg",
		    "productName": "Swayam Shades of India Double Bedsheet",
		    "productURL": "http://www.flipkart.com/dl/swayam-shades-india-double-bedsheet/p/itmdnryf6pqwjrqn?pid=BDSDMEVYQDCYZRKG&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1124
		  },
		  {
		    "__v": 0,
		    "_id": "543415bef3743ac257f2ef2f",
		    "currentPrice": 31310,
		    "productImage": "http://img5a.flixcart.com/image/mobile/v/q/w/lg-g-pro-2-d838-400x400-imadvrmbdxhyfbr3.jpeg",
		    "productName": "LG G Pro 2 D838",
		    "productURL": "http://www.flipkart.com/dl/lg-g-pro-2-d838/p/itmdvshtzydwuu3f?pid=MOBDVRGDTYV7GVQW&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 31000
		  },
		  {
		    "__v": 0,
		    "_id": "5433f7d387adc5161cce8a09",
		    "currentPrice": 65899,
		    "productImage": "http://img6a.flixcart.com/image/computer/h/7/e/apple-macbook-air-notebook-400x400-imadnat64rts2aj9.jpeg",
		    "productName": "Apple MD760HN/A MacBook Air (4th Gen Ci5/ 4GB/ 128GB Flash/ Mac OS X Mountain Lion)",
		    "productURL": "http://www.flipkart.com/dl/apple-md760hn-a-macbook-air-4th-gen-ci5-4gb-128gb-flash-mac-os-x-mountain-lion/p/itmdna8yw3kfyvfw?affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 65899
		  },
		  {
		    "__v": 0,
		    "_id": "5433b92c87adc5161cce89f0",
		    "alertFromPrice": 27499,
		    "alertToPrice": 26500,
		    "currentPrice": 26500,
		    "productImage": "http://img5a.flixcart.com/image/camera/d/h/m/canon-eos-1200d-kit-ef-s18-55-is-ii-55-250-mm-is-ii-dslr-400x400-imaey5h3ehhfwdg3.jpeg",
		    "productName": "Canon EOS 1200D Kit (EF S18-55 IS II + 55-250 mm IS II) DSLR Camera",
		    "productURL": "http://www.flipkart.com/dl/canon-eos-1200d-kit-ef-s18-55-ii-55-250-mm-ii-dslr-camera/p/itmdugsshxq9fdhm?pid=CAMDUGSSHXQ9FDHM&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 26500
		  },
		  {
		    "__v": 0,
		    "_id": "543317c987adc5161cce89c4",
		    "currentPrice": 131589,
		    "productImage": "http://img6a.flixcart.com/image/computer/n/z/4/apple-macbook-pro-notebook-400x400-imadypafz6a3cbbd.jpeg",
		    "productName": "Apple MGXA2HN/A MacBook Pro Notebook (Ci7/ 16GB/ Mac OS X Mavericks)",
		    "productURL": "http://www.flipkart.com/dl/apple-mgxa2hn-a-macbook-pro-notebook-ci7-16gb-mac-os-x-mavericks/p/itmdyp9jj8zzzeds?affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 129900
		  },
		  {
		    "__v": 0,
		    "_id": "543317a787adc5161cce89c0",
		    "currentPrice": 163400,
		    "productImage": "http://img6a.flixcart.com/image/computer/n/z/4/apple-macbook-pro-notebook-400x400-imadypafz6a3cbbd.jpeg",
		    "productName": "Apple MGXC2HN/A MacBook Pro Notebook (Ci7/ 16GB/ Mac OS X Mavericks/ 2GB Graph)",
		    "productURL": "http://www.flipkart.com/dl/apple-mgxc2hn-a-macbook-pro-notebook-ci7-16gb-mac-os-x-mavericks-2gb-graph/p/itmdyp9jzqb6suhx?affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 163400
		  },
		  {
		    "__v": 0,
		    "_id": "5432ea7512678c1757c63ea8",
		    "currentPrice": 8999,
		    "productImage": "http://img6a.flixcart.com/image/monitor/y/p/r/dell-s2240l-400x400-imadf4pydtfawtgy.jpeg",
		    "productName": "Dell S2240L 21.5 inch LED Backlit LCD Monitor",
		    "productURL": "http://www.flipkart.com/dl/dell-s2240l-21-5-inch-led-backlit-lcd-monitor/p/itmdf4zvqauzt2z4?pid=MONDF4ZHPUYJBYPR&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 8634
		  },
		  {
		    "__v": 0,
		    "_id": "5432bd2612678c1757c63e95",
		    "currentPrice": 1520,
		    "productImage": "http://img6a.flixcart.com/image/watch/8/c/v/ti000u80300-timex-400x400-imady9z5nd87hb2t.jpeg",
		    "productName": "Timex Fashion Analog Watch  - For Men",
		    "productURL": "http://www.flipkart.com/dl/timex-fashion-analog-watch-men/p/itmduy66vfthz8cv?pid=WATDUY66VFTHZ8CV&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1520
		  },
		  {
		    "__v": 0,
		    "_id": "54328cda12678c1757c63e7e",
		    "currentPrice": 625,
		    "productImage": "http://img6a.flixcart.com/image/racquet/q/c/k/aypg382-w3-s2-strung-1-li-ning-badminton-racquet-xp-80-400x400-imadvyrcagjrptmn.jpeg",
		    "productName": "Li Ning XP-80 S2 Badminton Racquet",
		    "productURL": "http://www.flipkart.com/dl/li-ning-xp-80-s2-badminton-racquet/p/itmduzsf83xzg3ga?pid=RAQDUZSFSFTUFQCK&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 516
		  },
		  {
		    "__v": 0,
		    "_id": "54328ca512678c1757c63e7c",
		    "currentPrice": 2999,
		    "productImage": "http://img6a.flixcart.com/image/shoe/w/u/z/white-blue-fresh-start-iii-lp-reebok-6-400x400-imaeyardfnrcpubq.jpeg",
		    "productName": "Reebok Fresh Start Iii Lp Running Shoes",
		    "productURL": "http://www.flipkart.com/dl/reebok-fresh-start-iii-lp-running-shoes/p/itmdzekp7da8gd9h?pid=SHODZEKZW3PQFEDV&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1350
		  },
		  {
		    "__v": 0,
		    "_id": "543272db12678c1757c63e74",
		    "currentPrice": 545,
		    "productImage": "http://img5a.flixcart.com/image/mouse/b/j/g/logitech-b175-400x400-imadq48qhbv4wenh.jpeg",
		    "productName": "Logitech B175 Wireless Mouse",
		    "productURL": "http://www.flipkart.com/dl/logitech-b175-wireless-mouse/p/itmdhjzffse6tdz3?pid=ACCDHJZYGACAZBJG&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 500
		  },
		  {
		    "__v": 0,
		    "_id": "5432695212678c1757c63e71",
		    "currentPrice": 1459,
		    "productImage": "http://img6a.flixcart.com/image/mouse/z/b/b/logitech-g300-gaming-400x400-imaddgzgghubgahk.jpeg",
		    "productName": "Logitech G300 Gaming USB 2.0 Mouse",
		    "productURL": "http://www.flipkart.com/dl/logitech-g300-gaming-usb-2-0-mouse/p/itmdnymkfcscpxn2?pid=ACCD6AQS2ZBJMZBB&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1459
		  },
		  {
		    "__v": 0,
		    "_id": "5432647012678c1757c63e6f",
		    "currentPrice": 484,
		    "productImage": "http://img6a.flixcart.com/image/book/9/8/6/quantitative-aptitude-for-competitive-examinations-400x400-imadxndfvgksqkh4.jpeg",
		    "productName": "Quantitative Aptitude For Competitive Examinations (English) 17th Edition",
		    "productURL": "http://www.flipkart.com/dl/quantitative-aptitude-competitive-examinations-english-17th/p/itmdytga2sgpggmg?pid=9788121924986&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 402
		  },
		  {
		    "__v": 0,
		    "_id": "5432641212678c1757c63e6c",
		    "alertFromPrice": 7595,
		    "alertToPrice": 7036,
		    "currentPrice": 7036,
		    "productImage": "http://img5a.flixcart.com//image/lens/prime/7/s/w/canon-standard-ef-50mm-f-1-8-ii-400x400-imad5h4wkpbxctzp.jpeg",
		    "productName": "Canon EF 50 mm f/1.8 II Lens",
		    "productURL": "http://www.flipkart.com/dl/canon-ef-50-mm-f-1-8-ii-lens/p/itmcx3sgep6yd7sw?affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 6935
		  },
		  {
		    "__v": 0,
		    "_id": "5432538f12678c1757c63e5f",
		    "currentPrice": 27999,
		    "productImage": "http://img6a.flixcart.com/image/mobile/b/7/s/nokia-lumia-lumia-1020-400x400-imadzkgshuhjwfmk.jpeg",
		    "productName": "Nokia Lumia 1020",
		    "productURL": "http://www.flipkart.com/dl/nokia-lumia-1020/p/itmeyfpjufdt9phq?pid=MOBDZKH6XYX2SB7S&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 21999
		  },
		  {
		    "__v": 0,
		    "_id": "5432527312678c1757c63e5c",
		    "currentPrice": 999,
		    "productImage": "http://img6a.flixcart.com/image/battery-charger/portable-charger/h/c/b/mi-ndy-02-ah-400x400-imadyfjyymvgenmw.jpeg",
		    "productName": "Mi 10400 mAh Power Bank",
		    "productURL": "http://www.flipkart.com/dl/mi-10400-mah-power-bank/p/itmeyktwtmdwptvf?pid=ACCDYYQZQJCYEHCB&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 999
		  },
		  {
		    "__v": 0,
		    "_id": "54324dfe12678c1757c63e58",
		    "currentPrice": 40990,
		    "productImage": "http://img6a.flixcart.com/image/mobile/4/u/g/apple-iphone-5s-400x400-imadpppc9k3gzdjz.jpeg",
		    "productName": "Apple iPhone 5S",
		    "productURL": "http://www.flipkart.com/dl/apple-iphone-5s/p/itmdv6f75dyxhmt4?pid=MOBDPPZZDX8WSPAT&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 34999
		  },
		  {
		    "__v": 0,
		    "_id": "54324da612678c1757c63e56",
		    "currentPrice": 284,
		    "productImage": "http://img5a.flixcart.com/image/container/3/2/y/rmr-at-pc-8-pcs-blue-all-time-400x400-imadzmgcjs5sqbvx.jpeg",
		    "productName": "All Time Blue Polka Container 8 Pcs Set 1800 ml, 250 ml, 125 ml, 400 ml",
		    "productURL": "http://www.flipkart.com/dl/all-time-blue-polka-container-8-pcs-set-1800-ml-250-125-400-ml/p/itmdy4fyrfgyzcd4?pid=CNTDY4YRFBSB532Y&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 157
		  },
		  {
		    "__v": 0,
		    "_id": "54323c0412678c1757c63e4c",
		    "currentPrice": 6405,
		    "productImage": "http://img6a.flixcart.com/image/cooler/m/q/f/corsair-h80i-400x400-imadgsxtasd5t7zj.jpeg",
		    "productName": "Corsair H80i Cooler",
		    "productURL": "http://www.flipkart.com/dl/corsair-h80i-cooler/p/itmdgss7dpghhz5j?pid=COLDGSSYMRGF8MQF&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 6405
		  },
		  {
		    "__v": 0,
		    "_id": "543239c312678c1757c63e49",
		    "currentPrice": 500,
		    "productImage": "http://img5a.flixcart.com/image/t-shirt/q/h/x/cowboy-a-mel-imagica-xl-400x400-imadq34ngkwmnfzy.jpeg",
		    "productName": "Imagica Printed Men's Round Neck T-Shirt",
		    "productURL": "http://www.flipkart.com/dl/imagica-printed-men-s-round-neck-t-shirt/p/itmdq3yfzvdwgxsp?pid=TSHDQ3Y2CQXGVRTZ&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 500
		  },
		  {
		    "__v": 0,
		    "_id": "5432388812678c1757c63e47",
		    "currentPrice": 1990,
		    "productImage": "http://img6a.flixcart.com/image/watch/9/r/d/a217-casio-400x400-imaey7hyduhzk5dr.jpeg",
		    "productName": "Casio Enticer Analog Watch  - For Men",
		    "productURL": "http://www.flipkart.com/dl/casio-enticer-analog-watch-men/p/itmd9gjgmzfv7jbr?pid=WATD9H77FWXHG9RD&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1990
		  },
		  {
		    "__v": 0,
		    "_id": "5432386a12678c1757c63e45",
		    "currentPrice": 1990,
		    "productImage": "http://img5a.flixcart.com/image/watch/t/m/c/a218-casio-400x400-imada8uwdandz52y.jpeg",
		    "productName": "Casio Enticer Analog Watch  - For Men",
		    "productURL": "http://www.flipkart.com/dl/casio-enticer-analog-watch-men/p/itmd9gjgfvxkk7za?pid=WATD9H77ZHKZZTMC&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1890
		  },
		  {
		    "__v": 0,
		    "_id": "543226a912678c1757c63e43",
		    "currentPrice": 60999,
		    "productImage": "http://img5a.flixcart.com/image/computer/9/t/m/apple-macbook-pro-400x400-imadmkhjrazhgrqh.jpeg",
		    "productName": "Apple MD101HN/A Macbook Pro MD101HN/A Intel Core i5  -  13 inch, 500 GB HDD, 4 GB DDR3, Mac OS Laptop",
		    "productURL": "http://www.flipkart.com/dl/apple-md101hn-a-macbook-pro-intel-core-i5-13-inch-500-gb-hdd-4-ddr3-mac-os-laptop/p/itmdzmykfnyqzz6n?pid=COMDMKKAHYGRF9TM&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 60989
		  },
		  {
		    "__v": 0,
		    "_id": "5432257d12678c1757c63e3f",
		    "alertFromPrice": 64990,
		    "alertToPrice": 61999,
		    "currentPrice": 61999,
		    "productImage": "http://img6a.flixcart.com/image/computer/v/w/r/apple-macbook-air-notebook-400x400-imadwdzswggdyva6.jpeg",
		    "productName": "Apple MD760HN/B MacBook Air (Ci5/ 4GB/ 128GB Flash/ Mac OS X Mavericks)",
		    "productURL": "http://www.flipkart.com/dl/apple-md760hn-b-macbook-air-ci5-4gb-128gb-flash-mac-os-x-mavericks/p/itmdwdybkgzzgtbk?pid=COMDWDY8DDCHPKWA&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 59250
		  },
		  {
		    "__v": 0,
		    "_id": "5431f53f12678c1757c63e34",
		    "currentPrice": 4150,
		    "productImage": "http://img5a.flixcart.com/image/headset/v/v/b/logitech-h650e-400x400-imadymwxdhkzq3bq.jpeg",
		    "productName": "Logitech H650e Wired Gaming Headset",
		    "productURL": "http://www.flipkart.com/dl/logitech-h650e-wired-gaming-headset/p/itmdymwzj7rduvfk?affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 4150
		  },
		  {
		    "__v": 0,
		    "_id": "5431f52712678c1757c63e32",
		    "currentPrice": 6250,
		    "productImage": "http://img6a.flixcart.com/image/headset/e/q/y/logitech-h800-400x400-imad87hqxzrqfvmg.jpeg",
		    "productName": "Logitech H800",
		    "productURL": "http://www.flipkart.com/dl/logitech-h800/p/itmd86utknzhffkm?affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 6250
		  },
		  {
		    "__v": 0,
		    "_id": "54318421e57f0b3b51631cb4",
		    "alertFromPrice": 849,
		    "alertToPrice": 749,
		    "currentPrice": 750,
		    "productImage": "http://img5a.flixcart.com/image/perfume/z/7/s/eau-de-cologne-men-faberge-100-brut-400x400-imadpgxafbsz3mqn.jpeg",
		    "productName": "Faberge Brut Eau de Cologne  -  100 ml",
		    "productURL": "http://www.flipkart.com/dl/faberge-brut-eau-de-cologne-100-ml/p/itmdtaueyhhchzp4?pid=PERDPEXHDQZ7MZ7S&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 394
		  },
		  {
		    "__v": 0,
		    "_id": "54316ffaa98c2c111b1a034f",
		    "currentPrice": 36500,
		    "productImage": "http://img5a.flixcart.com/image/computer/t/9/k/lenovo-essential-notebook-400x400-imadz5z7ez6hjy6z.jpeg",
		    "productName": "Lenovo Essential G505s (59-379987) Laptop (APU Quad Core A8/ 4GB/ 1TB/ Win8/ 2GB Graph)",
		    "productURL": "http://www.flipkart.com/dl/lenovo-essential-g505s-59-379987-laptop-apu-quad-core-a8-4gb-1tb-win8-2gb-graph/p/itmdz5afmgr6facs?pid=COMDZ59FTHJV9T9K&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 33674
		  },
		  {
		    "__v": 0,
		    "_id": "54316bb9a98c2c111b1a034b",
		    "currentPrice": 34280,
		    "productImage": "http://img6a.flixcart.com/image/computer/e/k/j/hp-15-r032tx-400x400-imadzynpgzzygzg3.jpeg",
		    "productName": "HP 15-r032TX Notebook (4th Gen Ci3/ 4GB/ 500GB/ Win8.1/ 2GB Graph) (J8B78PA)",
		    "productURL": "http://www.flipkart.com/dl/hp-15-r032tx-notebook-4th-gen-ci3-4gb-500gb-win8-1-2gb-graph-j8b78pa/p/itmdztbqtbdn7gsz?pid=COMDZTBKPRG9QEKJ&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 34199
		  },
		  {
		    "__v": 0,
		    "_id": "54314c42a98c2c111b1a0349",
		    "currentPrice": 719,
		    "productImage": "http://img6a.flixcart.com/image/headphone/e/9/e/panasonic-rp-hs34e-400x400-imadw2wmkcgzajaz.jpeg",
		    "productName": "Panasonic RP-HS34E Wired Headphones",
		    "productURL": "http://www.flipkart.com/dl/panasonic-rp-hs34e-wired-headphones/p/itmdw2wusttt4z8b?pid=ACCDW2WUY8PAGE9E&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 719
		  },
		  {
		    "__v": 0,
		    "_id": "5430e432a98c2c111b1a033a",
		    "currentPrice": 38333,
		    "productImage": "http://img5a.flixcart.com/image/mobile/j/c/h/samsung-galaxy-note-3-galaxy-note-3-n9000-400x400-imadzrek9qwryxyn.jpeg",
		    "productName": "Samsung Galaxy Note 3 N9000",
		    "productURL": "http://www.flipkart.com/dl/samsung-galaxy-note-3-n9000/p/itmdv6f5dmrdkj2h?pid=MOBDZQ2EGPHQPJCH&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 35829
		  },
		  {
		    "__v": 0,
		    "_id": "54300d703e8fe3a71216ded8",
		    "currentPrice": 404,
		    "productImage": "http://img5a.flixcart.com/image/sari/h/2/t/3310pnk-cenizas-400x400-imadzkdszgs85amq.jpeg",
		    "productName": "Cenizas Floral Print Art Silk Sari",
		    "productURL": "http://www.flipkart.com/dl/cenizas-floral-print-art-silk-sari/p/itmdzm3ayrqhesyy?pid=SARDYVZDAFGGAH2T&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 395
		  },
		  {
		    "__v": 0,
		    "_id": "542e09c06f08df91073b61a9",
		    "currentPrice": 30110,
		    "productImage": "http://img6a.flixcart.com/image/mobile/z/p/j/sony-xperia-z1-400x400-imadwjhzdtymsakg.jpeg",
		    "productName": "Sony Xperia Z1",
		    "productURL": "http://www.flipkart.com/dl/sony-xperia-z1/p/itmdv6f3anggtzzd?pid=MOBDZKH6EP2JCZPJ&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 29990
		  },
		  {
		    "__v": 0,
		    "_id": "542cee64afccee9d69f58e18",
		    "currentPrice": 67990,
		    "productImage": "http://img5a.flixcart.com/image/computer/p/t/a/dell-inspiron-notebook-400x400-imadm6yjtx65jzv8.jpeg",
		    "productName": "Dell Inspiron 15R 5521 Laptop (3rd Gen Ci7/ 8GB/ 1TB/ Win8/ 2GB Graph)",
		    "productURL": "http://www.flipkart.com/dl/dell-inspiron-15r-5521-laptop-3rd-gen-ci7-8gb-1tb-win8-2gb-graph/p/itmdm5ug8bjhhgsq?pid=COMDM5UG8BJHHGSQ&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 67990
		  },
		  {
		    "__v": 0,
		    "_id": "542cec15afccee9d69f58e16",
		    "currentPrice": 60490,
		    "productImage": "http://img5a.flixcart.com/image/computer/w/y/u/dell-inspiron-notebook-400x400-imadx8wfstqh8nxs.jpeg",
		    "productName": "Dell Inspiron 15 3542 Notebook (4th Gen Ci7/ 8GB/ 1TB/ Win8.1/ 2GB Graph)",
		    "productURL": "http://www.flipkart.com/dl/dell-inspiron-15-3542-notebook-4th-gen-ci7-8gb-1tb-win8-1-2gb-graph/p/itmdx8pkth5h94yp?pid=COMDX8PAPKFFSCA4&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 55937
		  },
		  {
		    "__v": 0,
		    "_id": "542cec04afccee9d69f58e14",
		    "currentPrice": 45489,
		    "productImage": "http://img6a.flixcart.com/image/computer/2/y/g/dell-inspiron-notebook-400x400-imadyfjznryqzzdz.jpeg",
		    "productName": "Dell Inspiron 15 3542 Notebook (4th Gen Ci5/ 4GB/ 1TB/ Win8.1/ 2GB Graph)",
		    "productURL": "http://www.flipkart.com/dl/dell-inspiron-15-3542-notebook-4th-gen-ci5-4gb-1tb-win8-1-2gb-graph/p/itmdyyvuyqfcjzyz?pid=COMDYYV6SFBXZ2YG&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 43060
		  },
		  {
		    "__v": 0,
		    "_id": "542cebf0afccee9d69f58e12",
		    "currentPrice": 49500,
		    "productImage": "http://img5a.flixcart.com/image/computer/x/x/e/dell-inspiron-notebook-400x400-imadpzjsqweghjhc.jpeg",
		    "productName": "Dell Inspiron 15 Laptop (4th Gen Ci5/ 6GB/ 1TB/ Win8/ 2GB Graph)",
		    "productURL": "http://www.flipkart.com/dl/dell-inspiron-15-laptop-4th-gen-ci5-6gb-1tb-win8-2gb-graph/p/itmdpznnnzjygqzj?pid=COMDPZNHZGFEXXXE&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 49500
		  },
		  {
		    "__v": 0,
		    "_id": "542cebe3afccee9d69f58e10",
		    "currentPrice": 41990,
		    "productImage": "http://img6a.flixcart.com/image/computer/t/s/z/dell-inspiron-notebook-400x400-imadyfjy6wqcg9vh.jpeg",
		    "productName": "Dell Inspiron 15 3542 Notebook (4th Gen Ci5/ 4GB/ 1TB/ Ubuntu/ 2GB Graph)",
		    "productURL": "http://www.flipkart.com/dl/dell-inspiron-15-3542-notebook-4th-gen-ci5-4gb-1tb-ubuntu-2gb-graph/p/itmdyyvurtumpzmp?pid=COMDYYV64JYP5TSZ&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 39710
		  },
		  {
		    "__v": 0,
		    "_id": "542cea2cafccee9d69f58e0e",
		    "currentPrice": 14999,
		    "productImage": "http://img6a.flixcart.com/image/mobile/z/z/h/sony-xperia-sp-400x400-imadzartrhxxjnuz.jpeg",
		    "productName": "Sony Xperia SP",
		    "productURL": "http://www.flipkart.com/dl/sony-xperia-sp/p/itmdxrzweufhaebq?pid=MOBDJMZ2U6JFHZZH&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 12999
		  },
		  {
		    "__v": 0,
		    "_id": "542af5a16bf0cefc598d429d",
		    "alertFromPrice": 1686,
		    "alertToPrice": 1599,
		    "currentPrice": 1597,
		    "productImage": "http://img6a.flixcart.com/image/headphone/8/g/g/sony-xb-30-400x400-imadfj8zkcpjpzdt.jpeg",
		    "productName": "Sony MDR-XB30EX Extra-Bass Stereo Headphone",
		    "productURL": "http://www.flipkart.com/dl/sony-mdr-xb30ex-extra-bass-stereo-headphone/p/itmdmds3jsyc9mdj?pid=ACCDFJ7UT2MZF8GG&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1193
		  },
		  {
		    "__v": 0,
		    "_id": "542a8fe23bf9bf615791316c",
		    "currentPrice": 28990,
		    "productImage": "http://img5a.flixcart.com/image/computer/4/q/y/dell-latitude-notebook-400x400-imadxhg9y82jzzmp.jpeg",
		    "productName": "Dell V3540 Latitude Intel Core i3  -  15.6 inch, 500 GB HDD, 4 GB DDR3, Linux/Ubuntu Laptop",
		    "productURL": "http://www.flipkart.com/dl/dell-v3540-latitude-intel-core-i3-15-6-inch-500-gb-hdd-4-ddr3-linux-ubuntu-laptop/p/itmdxgv5p6xc7z2s?pid=COMDXGV5FGBZV4QY&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 27990
		  },
		  {
		    "__v": 0,
		    "_id": "542a12c482b62bc64dd4a868",
		    "currentPrice": 47599,
		    "productImage": "http://img6a.flixcart.com/image/mobile/g/u/p/sony-xperia-z3-400x400-imaey8gdtkrgxgcp.jpeg",
		    "productName": "Sony Xperia Z3",
		    "productURL": "http://www.flipkart.com/dl/sony-xperia-z3/p/itmey7g3xeygedyv?pid=MOBEY7FJCHMXFGUP&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 47599
		  },
		  {
		    "__v": 0,
		    "_id": "54296a2782b62bc64dd4a864",
		    "currentPrice": 8999,
		    "productImage": "http://img5a.flixcart.com//image/speaker/g/x/9/jbl-harman-kardon-soundsticks-iii-400x400-imad4ragx2zhww2u.jpeg",
		    "productName": "Harman Kardon Soundsticks III Multimedia Speakers",
		    "productURL": "http://www.flipkart.com/dl/harman-kardon-soundsticks-iii-multimedia-speakers/p/itmdsbayv4rxqsbw?pid=ACCDF8FZFRJKGGX9&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 8999
		  },
		  {
		    "__v": 0,
		    "_id": "5428feaae29cc9e23d5ff1b8",
		    "currentPrice": 2819,
		    "productImage": "http://img6a.flixcart.com/image/book/4/8/0/buddha-box-set-400x400-imadxd9964xqppnp.jpeg",
		    "productName": "Buddha - Box Set (English)",
		    "productURL": "http://www.flipkart.com/dl/buddha-box-set-english/p/itmdx5dgga9szrh4?pid=9780007942480&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1208
		  },
		  {
		    "__v": 0,
		    "_id": "5426e339b1eda1601d74d800",
		    "currentPrice": 26380,
		    "productImage": "http://img5a.flixcart.com/image/computer/m/3/9/lenovo-essential-notebook-400x400-imadmzykffnzwvju.jpeg",
		    "productName": "Lenovo Essential G505 (59-387133) Laptop (APU Dual Core/ 4GB/ 500GB/ Win8)",
		    "productURL": "http://www.flipkart.com/dl/lenovo-essential-g505-59-387133-laptop-apu-dual-core-4gb-500gb-win8/p/itmdmzxgjn24htxk?pid=COMDMZXEUBQEUM39&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 26380
		  },
		  {
		    "__v": 0,
		    "_id": "5426e2e1b1eda1601d74d7fd",
		    "currentPrice": 33400,
		    "productImage": "http://img5a.flixcart.com/image/computer/b/g/4/hp-pavilion-notebook-400x400-imadpfd2gutthgaq.jpeg",
		    "productName": "HP Pavilion 15-n006AX Laptop (APU Quad Core A4/ 4GB/ 500GB/ Win8/ 1GB Graph)",
		    "productURL": "http://www.flipkart.com/dl/hp-pavilion-15-n006ax-laptop-apu-quad-core-a4-4gb-500gb-win8-1gb-graph/p/itmdpfaf4gfhaxfv?pid=COMDPFABZDHGBSG5&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 30781
		  },
		  {
		    "__v": 0,
		    "_id": "54253dffbc07afd57c8ab278",
		    "currentPrice": 8290,
		    "productImage": "http://img5a.flixcart.com/image/microwave-new/v/f/q/samsung-ms23f301tak-tl-400x400-imadwr9mkk6gdsza.jpeg",
		    "productName": "Samsung MG23F301TCK/TL 23 L Grill Microwave Oven",
		    "productURL": "http://www.flipkart.com/dl/samsung-mg23f301tck-tl-23-l-grill-microwave-oven/p/itmdwdmyn5dx9zhy?pid=MRCDWBZXCDBGGDT4&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 7727
		  },
		  {
		    "__v": 0,
		    "_id": "5424c359bc07afd57c8ab26f",
		    "currentPrice": 29990,
		    "productImage": "http://img5a.flixcart.com/image/mobile/k/j/t/sony-xperia-z-ultra-400x400-imadwjmy7yeep2w9.jpeg",
		    "productName": "Sony Xperia Z Ultra",
		    "productURL": "http://www.flipkart.com/dl/sony-xperia-z-ultra/p/itmdv6f4nq3jm7bj?pid=MOBDN2BF2FM7GKJT&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 27190
		  },
		  {
		    "__v": 0,
		    "_id": "5424c345bc07afd57c8ab26d",
		    "currentPrice": 38198,
		    "productImage": "http://img6a.flixcart.com/image/mobile/h/k/h/sony-xperia-z2-400x400-imadvy7rgexautyz.jpeg",
		    "productName": "Sony Xperia Z2",
		    "productURL": "http://www.flipkart.com/dl/sony-xperia-z2/p/itmdvw7rmzuz2tb7?pid=MOBDVW6SVHFYDHKH&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 36799
		  },
		  {
		    "__v": 0,
		    "_id": "5424c2d0bc07afd57c8ab26b",
		    "alertFromPrice": 28999,
		    "alertToPrice": 28699,
		    "currentPrice": 28699,
		    "productImage": "http://img6a.flixcart.com/image/mobile/r/2/w/sony-xperia-z-400x400-imadwjhxkz4b9dbm.jpeg",
		    "productName": "Sony Xperia Z",
		    "productURL": "http://www.flipkart.com/dl/sony-xperia-z/p/itmdv6f7jewegnsq?pid=MOBDGPDZ5BRABR2W&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 23400
		  },
		  {
		    "__v": 0,
		    "_id": "5424c24fbc07afd57c8ab269",
		    "currentPrice": 29900,
		    "productImage": "http://img6a.flixcart.com/image/mobile/m/a/9/sony-xperia-z1-compact-400x400-imadwjsjqjuyrn3g.jpeg",
		    "productName": "Sony Xperia Z1 Compact",
		    "productURL": "http://www.flipkart.com/dl/sony-xperia-z1-compact/p/itmdv6f54nms7bc2?pid=MOBDTNUY5FFGWMA9&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 29500
		  },
		  {
		    "__v": 0,
		    "_id": "54246e22bc07afd57c8ab266",
		    "currentPrice": 12999,
		    "productImage": "http://img6a.flixcart.com/image/mobile/r/f/c/motorola-xt1068-400x400-imadzmftdsmnqx3k.jpeg",
		    "productName": "Moto G (2nd Gen)",
		    "productURL": "http://www.flipkart.com/dl/moto-g-2nd-gen/p/itmdygz8gqk2w3xp?pid=MOBDYGZ6SHNB7RFC&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 12999
		  },
		  {
		    "__v": 0,
		    "_id": "54246d4bbc07afd57c8ab264",
		    "currentPrice": 2310,
		    "productImage": "http://img5a.flixcart.com/image/headset/7/7/f/skullcandy-uprock-s5urfw-342-premium-with-mic-400x400-imadrfw3rwcvqzwh.jpeg",
		    "productName": "Skullcandy Uprock S5URFW-342 Premium with Mic Wired Headset",
		    "productURL": "http://www.flipkart.com/dl/skullcandy-uprock-s5urfw-342-premium-mic-wired-headset/p/itmdrha84nf6gzdr?pid=ACCDRHA75HXK577F&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1399
		  },
		  {
		    "__v": 0,
		    "_id": "54246cdcbc07afd57c8ab261",
		    "alertFromPrice": 2270,
		    "alertToPrice": 2195,
		    "currentPrice": 2195,
		    "productImage": "http://img5a.flixcart.com/image/headset/f/s/g/skullcandy-s5urfy-314-400x400-imadsn8qnbb4dqf4.jpeg",
		    "productName": "Skullcandy S5URFY-314 Uprock with Mic On-the-ear Headset",
		    "productURL": "http://www.flipkart.com/dl/skullcandy-s5urfy-314-uprock-mic-on-the-ear-headset/p/itmdsn8kxcmsmsca?pid=ACCDSN8FTWSPVFSG&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1399
		  },
		  {
		    "__v": 0,
		    "_id": "54246ccfbc07afd57c8ab25f",
		    "currentPrice": 1499,
		    "productImage": "http://img6a.flixcart.com/image/headset/z/f/3/skullcandy-sgurfy-157-400x400-imadwvbjhgvuzwsa.jpeg",
		    "productName": "Skullcandy SGURGY-157 Uprock 2.0 World Cup Soccer France On-the-ear Headset",
		    "productURL": "http://www.flipkart.com/dl/skullcandy-sgurgy-157-uprock-2-0-world-cup-soccer-france-on-the-ear-headset/p/itmdwvb9h96gphbb?pid=ACCDWVB8WHBNEZF3&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1499
		  },
		  {
		    "__v": 0,
		    "_id": "54246455bc07afd57c8ab25d",
		    "currentPrice": 499,
		    "productImage": "http://img5a.flixcart.com/image/book/6/0/6/breakfast-of-champions-400x400-imadxfhg4jpque7e.jpeg",
		    "productName": "Breakfast Of Champions (English)",
		    "productURL": "http://www.flipkart.com/dl/breakfast-champions-english/p/itmdzzckg3dnysd2?pid=9780099842606&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 375
		  },
		  {
		    "__v": 0,
		    "_id": "54245b392770a7ef791e00a8",
		    "currentPrice": 777,
		    "productImage": "http://img6a.flixcart.com/image/book/2/0/7/the-book-thief-400x400-imadqcdx9ne5egd3.jpeg",
		    "productName": "The Book Thief (English)",
		    "productURL": "http://www.flipkart.com/dl/book-thief-english/p/itmdzhd8gpjng5vw?pid=9780375842207&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 735
		  },
		  {
		    "__v": 0,
		    "_id": "54218f1174d1d6d223a62ce7",
		    "currentPrice": 3795,
		    "productImage": "http://img6a.flixcart.com/image/shoe/9/n/r/khaki-gc-0712109y14-woodland-43-400x400-imadxdddyhrhhhd7.jpeg",
		    "productName": "Woodland Outdoors Shoes",
		    "productURL": "http://www.flipkart.com/dl/woodland-outdoors-shoes/p/itmdvzad7ykkqwra?pid=SHODVZ8E9HMUT3G2&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 2656
		  },
		  {
		    "__v": 0,
		    "_id": "54201a2de5c8b0b2083e508b",
		    "currentPrice": 795,
		    "productImage": "http://img6a.flixcart.com/image/worldwide-adaptor/w/n/h/apk01ap-22-targus-400x400-imadkejhm7khyqyv.jpeg",
		    "productName": "Targus Worldwide Adaptor",
		    "productURL": "http://www.flipkart.com/dl/targus-worldwide-adaptor/p/itmdka97g9vr5gzd?pid=WWADKA96QVQWPWNH&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 795
		  },
		  {
		    "__v": 0,
		    "_id": "541fe1ede5c8b0b2083e5085",
		    "alertFromPrice": 3599,
		    "alertToPrice": 3390,
		    "currentPrice": 3390,
		    "productImage": "http://img5a.flixcart.com/image/audioplayer/8/6/u/apple-ipod-shuffle-2-gb-space-gray-400x400-imadr722jrtmnxgj.jpeg",
		    "productName": "Apple iPod Shuffle 2 GB",
		    "productURL": "http://www.flipkart.com/dl/apple-ipod-shuffle-2-gb/p/itmey37zhuzd9qag?pid=AUDDQX4YH4G8T86U&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 2699
		  },
		  {
		    "__v": 0,
		    "_id": "541eb3c9326e7002730735d0",
		    "currentPrice": 590,
		    "productImage": "http://img6a.flixcart.com/image/cases-covers/back-cover/x/y/6/motorola-color-series-shells-400x400-imadsyhzas4vzyzh.jpeg",
		    "productName": "Motorola Back Cover for Moto G (1st Gen)",
		    "productURL": "http://www.flipkart.com/dl/motorola-back-cover-moto-g-1st-gen/p/itmduqpzzguvjbjc?pid=ACCDSGVGPHP5BXY6&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 440
		  },
		  {
		    "__v": 0,
		    "_id": "541bde4557493e3f4157ebb0",
		    "currentPrice": 4300,
		    "productImage": "http://img6a.flixcart.com//image/psu/h/9/e/seasonic-s12ii-520-400x400-imad66g4ftyfwpbq.jpeg",
		    "productName": "Seasonic S12II 430 Watts PSU",
		    "productURL": "http://www.flipkart.com/dl/seasonic-s12ii-430-watts-psu/p/itmd5xz5bzevdbzp?pid=PSUD5XZ4PQNBPMES&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 3503
		  },
		  {
		    "__v": 0,
		    "_id": "541bb76257493e3f4157eba9",
		    "currentPrice": 975,
		    "productImage": "http://img5a.flixcart.com/image/shaving-cartridge/z/c/z/12-gillette-mach-3-cartridges-400x400-imadzytayxbrd3f5.jpeg",
		    "productName": "Gillette Mach 3 Cartridges",
		    "productURL": "http://www.flipkart.com/dl/gillette-mach-3-cartridges/p/itmd9athxtgegmvf?affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 780
		  },
		  {
		    "__v": 0,
		    "_id": "541bb5a557493e3f4157eba5",
		    "alertFromPrice": 65490,
		    "alertToPrice": 60049,
		    "currentPrice": 60049,
		    "productImage": "http://img5a.flixcart.com/image/camera/b/x/w/canon-eos-700d-slr-400x400-imadk2apheefh4qm.jpeg",
		    "productName": "Canon EOS 700D DSLR Camera",
		    "productURL": "http://www.flipkart.com/dl/canon-eos-700d-dslr-camera/p/itmdv58fpfzgahmj?affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 54396
		  },
		  {
		    "__v": 0,
		    "_id": "5419df10e37af6df3683a50e",
		    "currentPrice": 4408,
		    "productImage": "http://img5a.flixcart.com//image/headphone/on-ear/6/k/e/koss-porta-pro-400x400-imad4urxcj6u6vyy.jpeg",
		    "productName": "Koss Porta-Pro Wired Headphones",
		    "productURL": "http://www.flipkart.com/dl/koss-porta-pro-wired-headphones/p/itmd4tpzfyzqfjzk?pid=ACCD4TPYMCGSQ6KE&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 4408
		  },
		  {
		    "__v": 0,
		    "_id": "5419c616d59096bb618041ea",
		    "currentPrice": 12999,
		    "productImage": "http://img5a.flixcart.com/image/shoe/d/v/s/wintergreen-chameleon-ii-wtpf-mid-leather-merrell-11-400x400-imadw6828fg8jayj.jpeg",
		    "productName": "Merrell Chameleon II WTPF Mid Leather Hiking & Trekking Shoes",
		    "productURL": "http://www.flipkart.com/dl/merrell-chameleon-ii-wtpf-mid-leather-hiking-trekking-shoes/p/itmduwan66wkkhhu?pid=SHODUWAKNQF2GADT&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 12999
		  },
		  {
		    "__v": 0,
		    "_id": "5416ab47d59096bb618041ab",
		    "currentPrice": 19990,
		    "productImage": "http://img6a.flixcart.com/image/gamingconsole/g/r/2/400x400-imadqgsx8kyrvfxm.jpeg",
		    "productName": "Sony PS3 12 GB Move with Street Cricket II",
		    "productURL": "http://www.flipkart.com/dl/sony-ps3-12-gb-move-street-cricket-ii/p/itmdv5g3be3pr4ux?pid=GMCDQGHMBRPEWGR2&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 19390
		  },
		  {
		    "__v": 0,
		    "_id": "541696bfd59096bb618041a6",
		    "currentPrice": 6160,
		    "productImage": "http://img5a.flixcart.com/image/headset/u/w/6/jabra-rox-wireless-400x400-imadxp8yshtrjynm.jpeg",
		    "productName": "Jabra ROX Wireless Headset",
		    "productURL": "http://www.flipkart.com/dl/jabra-rox-wireless-headset/p/itmdxp634ghwtuft?pid=ACCDXP5VJBF3WUW6&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 5559
		  },
		  {
		    "__v": 0,
		    "_id": "541694d1d59096bb618041a4",
		    "currentPrice": 2199,
		    "productImage": "http://img6a.flixcart.com/image/headset/m/j/d/jabra-ote15-400x400-imady3yqaa3gkyqs.jpeg",
		    "productName": "Jabra Mini Wireless Bluetooth Headset",
		    "productURL": "http://www.flipkart.com/dl/jabra-mini-wireless-bluetooth-headset/p/itmdy32kx2t98e7v?pid=ACCDY32K4QKEKMJD&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1679
		  },
		  {
		    "__v": 0,
		    "_id": "5415dd21d59096bb618041a2",
		    "currentPrice": 3299,
		    "productImage": "http://img6a.flixcart.com/image/speaker/multimedia-speaker/2/z/e/jbl-jembe-bt-400x400-imadethhyeztrurq.jpeg",
		    "productName": "JBL Jembe BT Multimedia Speakers",
		    "productURL": "http://www.flipkart.com/dl/jbl-jembe-bt-multimedia-speakers/p/itmdetgvymjjyqcw?pid=ACCDETCTHD9DH2ZE&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 2850
		  },
		  {
		    "__v": 0,
		    "_id": "5415a58fd59096bb618041a0",
		    "currentPrice": 2590,
		    "productImage": "http://img5a.flixcart.com/image/headset/f/f/v/jabra-jabra-tag-400x400-imadvhy53gwxs2bf.jpeg",
		    "productName": "Jabra Tag Bluetooth Stereo Headset with FM Radio",
		    "productURL": "http://www.flipkart.com/dl/jabra-tag-bluetooth-stereo-headset-fm-radio/p/itmdvjwsuhg4yaxp?pid=ACCDVJWA2NQMGFFV&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 2099
		  },
		  {
		    "__v": 0,
		    "_id": "54153bf1d59096bb6180419b",
		    "currentPrice": 3725,
		    "productImage": "http://img5a.flixcart.com//image/keyboard/keyboards/f/8/u/microsoft-b2m-00009-400x400-imad67styfgyjtqu.jpeg",
		    "productName": "Microsoft B2M-00009 Natural Ergo 4000 USB 2.0  Keyboard",
		    "productURL": "http://www.flipkart.com/dl/microsoft-b2m-00009-natural-ergo-4000-usb-2-0-keyboard/p/itmdmez9sscxez4x?pid=ACCCWPCDTEDHNF8U&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 3725
		  },
		  {
		    "__v": 0,
		    "_id": "5411df14a34d9755295db27a",
		    "currentPrice": 2299,
		    "productImage": "http://img6a.flixcart.com/image/book/4/3/8/the-delux-collection-400x400-imadekkpqf3bxyyr.jpeg",
		    "productName": "The Delux Collection (English)",
		    "productURL": "http://www.flipkart.com/dl/delux-collection-english/p/itmczymc6zkwb8cd?pid=9780007839438&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 904
		  },
		  {
		    "__v": 0,
		    "_id": "540fda28a34d9755295db26b",
		    "currentPrice": 2000,
		    "productImage": "http://img6a.flixcart.com/image/book/9/8/1/a-song-of-ice-and-fire-set-of-6-books-400x400-imadvjga6mur2fay.jpeg",
		    "productName": "Song Ice & Fire Game Thrones x6 In Only (English)",
		    "productURL": "http://www.flipkart.com/dl/song-ice-fire-game-thrones-x6-only-english/p/itmdgy2fdac8jyzw?pid=9780007515981&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1160
		  },
		  {
		    "__v": 0,
		    "_id": "540e9d6ea34d9755295db25d",
		    "alertFromPrice": 29899,
		    "alertToPrice": 26790,
		    "currentPrice": 26790,
		    "productImage": "http://img6a.flixcart.com/image/tablet/r/d/h/apple-ipad-mini-wi-fi-and-cellular-16gb-400x400-imadrhaqd63rzfrf.jpeg",
		    "productName": "Apple 16GB iPad Mini with Wi-Fi and Cellular",
		    "productURL": "http://www.flipkart.com/dl/apple-16gb-ipad-mini-wi-fi-cellular/p/itmdxf5zuhghmqqp?pid=TABDFWGGEVXG2RDH&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 24900
		  },
		  {
		    "__v": 0,
		    "_id": "540e8d1ba34d9755295db25b",
		    "currentPrice": 2000,
		    "productImage": "http://img5a.flixcart.com/image/battery-charger/portable-charger/p/h/b/digiflip-pc012-400x400-imadxf78vet27qy4.jpeg",
		    "productName": "DigiFlip Power Bank 11000 mAh PC012",
		    "productURL": "http://www.flipkart.com/dl/digiflip-power-bank-11000-mah-pc012/p/itmdu6nqttntfphb?pid=ACCDU6NQTTNTFPHB&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1200
		  },
		  {
		    "__v": 0,
		    "_id": "540942006ef7061d5198abe7",
		    "currentPrice": 45680,
		    "productImage": "http://img5a.flixcart.com/image/camera/m/j/b/canon-eos-700d-slr-400x400-imadk2apnbwxwxwp.jpeg",
		    "productName": "Canon EOS 700D DSLR Camera",
		    "productURL": "http://www.flipkart.com/dl/canon-eos-700d-dslr-camera/p/itmduzhvqhwabp5n?affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 42495
		  },
		  {
		    "__v": 0,
		    "_id": "540941846ef7061d5198abe5",
		    "alertFromPrice": 65490,
		    "alertToPrice": 60049,
		    "currentPrice": 60049,
		    "productImage": "http://img5a.flixcart.com/image/camera/b/x/w/canon-eos-700d-slr-400x400-imadk2apheefh4qm.jpeg",
		    "productName": "Canon EOS 700D DSLR Camera",
		    "productURL": "http://www.flipkart.com/dl/canon-eos-700d-dslr-camera/p/itmdv58fpfzgahmj?pid=CAMDKF78SEK3EBXW&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 54396
		  },
		  {
		    "__v": 0,
		    "_id": "54074e7c0bf557b5360c961b",
		    "currentPrice": 18490,
		    "productImage": "http://img6a.flixcart.com/image/mobile/y/k/s/sony-xperia-zr-400x400-imadwjmyhq8kghfk.jpeg",
		    "productName": "Sony Xperia ZR",
		    "productURL": "http://www.flipkart.com/dl/sony-xperia-zr/p/itmdv6f4wucawthp?pid=MOBDHPF8ZHB3MYKS&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 18490
		  },
		  {
		    "__v": 0,
		    "_id": "54074aa10bf557b5360c9616",
		    "currentPrice": 1999,
		    "productImage": "http://img5a.flixcart.com/image/headset/x/n/f/philips-oneil-cruz-400x400-imadhzewvcfdwh2n.jpeg",
		    "productName": "Philips Oneil Cruz On-the-ear Headset",
		    "productURL": "http://www.flipkart.com/dl/philips-oneil-cruz-on-the-ear-headset/p/itmdhzcq9rakwvw8?pid=ACCDHZCPYN7HSXNF&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 358
		  },
		  {
		    "__v": 0,
		    "_id": "54054b5c9762a76d31f04da6",
		    "currentPrice": 25300,
		    "productImage": "http://img6a.flixcart.com/image/mobile/7/c/c/lg-google-nexus-google-nexus-4-400x400-imadzbpmfya23szr.jpeg",
		    "productName": "Google Nexus 4",
		    "productURL": "http://www.flipkart.com/dl/google-nexus-4/p/itmdzsgjkemg8mzp?affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 23000
		  },
		  {
		    "__v": 0,
		    "_id": "540470822993161723641525",
		    "currentPrice": 14164,
		    "productImage": "http://img6a.flixcart.com/image/book/0/9/6/amar-chitra-katha-the-ultimate-collection-315-singles-10-400x400-imady3yz2dspcyjj.jpeg",
		    "productName": "Amar Chitra Katha - The Ultimate Collection (315 Singles + 10 Specials) (English)",
		    "productURL": "http://www.flipkart.com/dl/amar-chitra-katha-ultimate-collection-315-singles-10-specials-english/p/itmdxh6wr3tynxhm?pid=9789350855096&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 9499
		  },
		  {
		    "__v": 0,
		    "_id": "54031dd4299316172364151a",
		    "currentPrice": 5500,
		    "productImage": "http://img6a.flixcart.com/image/jean/g/k/w/19132-0001perf-rigid-indigo-denim-levi-s-32-400x400-imadxsxzbyjvk8ty.jpeg",
		    "productName": "Levi's Regular Fit Men's Jeans",
		    "productURL": "http://www.flipkart.com/dl/levi-s-regular-fit-men-s-jeans/p/itmdx7qdrepwzzz8?pid=JEADX7PYZDWFEKT4&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 5500
		  },
		  {
		    "__v": 0,
		    "_id": "5401892736cc19dd7623cf28",
		    "currentPrice": 45680,
		    "productImage": "http://img5a.flixcart.com/image/camera/m/j/b/canon-eos-700d-slr-400x400-imadk2apnbwxwxwp.jpeg",
		    "productName": "Canon EOS 700D DSLR Camera",
		    "productURL": "http://www.flipkart.com/dl/canon-eos-700d-dslr-camera/p/itmduzhvqhwabp5n?pid=CAMDKF78RGR4PMJB&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 42495
		  },
		  {
		    "__v": 0,
		    "_id": "5401887836cc19dd7623cf1e",
		    "currentPrice": 6999,
		    "productImage": "https://img1a.flixcart.com//image/mobile/g/s/m/motorola-xt1022-400x400-imadvvfjcbbpzb2b.jpeg",
		    "productName": "Moto E",
		    "productURL": "http://www.flipkart.com/dl/moto-e/p/itmdvuwsybgnbtha?affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1500
		  },
		  {
		    "__v": 0,
		    "_id": "5400102436cc19dd7623cf17",
		    "currentPrice": 3799,
		    "productImage": "http://img5a.flixcart.com/image/trouser/m/q/p/jms21249-239boulder-merrell-32-400x400-imads6ryfqvn6kvx.jpeg",
		    "productName": "Merrell Men's Trousers",
		    "productURL": "http://www.flipkart.com/dl/merrell-men-s-trousers/p/itmdrchmsvutfvgf?pid=TRODRCHKMGXX8MQP&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 3799
		  },
		  {
		    "__v": 0,
		    "_id": "53fd94fa41a7b54460f10d09",
		    "currentPrice": 14990,
		    "productImage": "http://img5a.flixcart.com/image/television/5/z/h/micromax-32t42echd-400x400-imadyg6sgftm2ujk.jpeg",
		    "productName": "Micromax 32T42ECHD 32 inches LED TV",
		    "productURL": "http://www.flipkart.com/dl/micromax-32t42echd-32-inches-led-tv/p/itmdxw2pzhezrspq?pid=TVSDXW2NHTQZW5ZH&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 13990
		  },
		  {
		    "__v": 0,
		    "_id": "53fd7e3341a7b54460f10d07",
		    "currentPrice": 16551,
		    "productImage": "http://img6a.flixcart.com/image/television/s/z/y/micromax-32b200hd-400x400-imadwbgzkydj6pjm.jpeg",
		    "productName": "Micromax 32B200HD 32 inches LED TV",
		    "productURL": "http://www.flipkart.com/dl/micromax-32b200hd-32-inches-led-tv/p/itmdtz6nn78yhszy?pid=TVSDTZ6NN78YHSZY&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 15292
		  },
		  {
		    "__v": 0,
		    "_id": "53fb6b2641a7b54460f10d00",
		    "alertFromPrice": 20990,
		    "alertToPrice": 20390,
		    "currentPrice": 20990,
		    "productImage": "http://img6a.flixcart.com/image/lens/zoom/g/h/x/nikon-high-power-zoom-af-s-dx-nikkor-55-300mm-f-4-5-5-6g-ed-vr-400x400-imacyqhasgdwj9fe.jpeg",
		    "productName": "Nikon AF-S DX NIKKOR 55 - 300 mm f/4.5-5.6G ED VR Lens",
		    "productURL": "http://www.flipkart.com/dl/nikon-af-s-dx-nikkor-55-300-mm-f-4-5-5-6g-ed-vr-lens/p/itmcx3sgdzfgcghx?pid=ACCCX3SGDZFGCGHX&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 20246
		  },
		  {
		    "__v": 0,
		    "_id": "53fb6ad841a7b54460f10cfc",
		    "currentPrice": 25689,
		    "productImage": "http://img6a.flixcart.com/image/camera/m/h/s/nikon-d5100-slr-400x400-imacy9wht4ymhkfe.jpeg",
		    "productName": "Nikon D5100 DSLR Camera",
		    "productURL": "http://www.flipkart.com/dl/nikon-d5100-dslr-camera/p/itmduzhmeyjh2zec?pid=CAMCXH4FFUDGAMHS&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 22793
		  },
		  {
		    "__v": 0,
		    "_id": "53fac300a4b18ae621d8f0cd",
		    "currentPrice": 1695,
		    "productImage": "http://img5a.flixcart.com/image/hair-dryer/m/p/v/philips-kerashine-hp8216-400x400-imadmgyugbfzqw5s.jpeg",
		    "productName": "Philips Kerashine HP8216 Hair Dryer",
		    "productURL": "http://www.flipkart.com/dl/philips-kerashine-hp8216-hair-dryer/p/itmdhrzbfetrjbfy?pid=HDRDHRZAENYJUMPV&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1640
		  },
		  {
		    "__v": 0,
		    "_id": "53f8d2ffa4b18ae621d8f0bc",
		    "currentPrice": 9899,
		    "productImage": "http://img5a.flixcart.com/image/shoe/n/y/8/wild-dove-tanga-proterra-mid-sport-gore-tex-merrell-9-400x400-imadxy8zvq8wjgtd.jpeg",
		    "productName": "Merrell Proterra Mid Sport Gore-Tex Hiking & Trekking Shoes",
		    "productURL": "http://www.flipkart.com/dl/merrell-proterra-mid-sport-gore-tex-hiking-trekking-shoes/p/itmduwamzxzt2vmr?pid=SHODUWAKDXMWUPFP&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 5499
		  },
		  {
		    "__v": 0,
		    "_id": "53f89ed52d3755d10cf9515e",
		    "currentPrice": 8999,
		    "productImage": "http://img5a.flixcart.com//image/headphone/over-the-ear/s/a/p/audio-technica-ath-m50-400x400-imad6hkskkecak3z.jpeg",
		    "productName": "Audio-Technica ATH-M50 Wired Headphones",
		    "productURL": "http://www.flipkart.com/dl/audio-technica-ath-m50-wired-headphones/p/itmd6hk8b9ff2rhh?affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 8999
		  },
		  {
		    "__v": 0,
		    "_id": "53f781a02d3755d10cf9514e",
		    "currentPrice": 9999,
		    "productImage": "http://img6a.flixcart.com//image/printer/k/n/z/hp-hp-laserjet-pro-m1136-multifunction-printer-400x400-imad4z6fa4k3q2ay.jpeg",
		    "productName": "HP LaserJet Pro - M1136 Multi-function Laser Printer",
		    "productURL": "http://www.flipkart.com/dl/hp-laserjet-pro-m1136-multi-function-laser-printer/p/itmd4z5xsyyrkg7s?pid=PRND4Z5Q3JR46KNZ&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 9165
		  },
		  {
		    "__v": 0,
		    "_id": "53f77de62d3755d10cf95144",
		    "currentPrice": 9900,
		    "productImage": "http://img6a.flixcart.com//image/printer/4/h/f/canon-mf3010-400x400-imad763hfgk2hj2y.jpeg",
		    "productName": "Canon Image Class - MF3010 Multi-function Laser Printer",
		    "productURL": "http://www.flipkart.com/dl/canon-image-class-mf3010-multi-function-laser-printer/p/itmd4paucwynzs53?pid=PRND4PATTGPFW4HF&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 9000
		  },
		  {
		    "__v": 0,
		    "_id": "53f623a6155fbfef6654e5bc",
		    "currentPrice": 1150,
		    "productImage": "http://img5a.flixcart.com/image/shaver/g/h/q/philips-qt4001-400x400-imadu7yupup66vzr.jpeg",
		    "productName": "Philips QT4001/15 Trimmer For Men",
		    "productURL": "http://www.flipkart.com/dl/philips-qt4001-15-trimmer-men/p/itmdu7ymtpdptghq?pid=SHVDU7YMTPDPTGHQ&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 849
		  },
		  {
		    "__v": 0,
		    "_id": "53f5d82b155fbfef6654e5b0",
		    "currentPrice": 11140,
		    "productImage": "http://img5a.flixcart.com/image/headset/m/r/p/beats-by-dr-dre-monster-mh-bts-ie-lj-ct-400x400-imadzxqknggkcvk2.jpeg",
		    "productName": "Beats by Dr.Dre Monster 900-00007-02 Powerbeats In-the-ear Headset",
		    "productURL": "http://www.flipkart.com/dl/beats-dr-dre-monster-900-00007-02-powerbeats-in-the-ear-headset/p/itmdrfwvzgpzfybz?pid=ACCDZTP2G7EWGMRP&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 8400
		  },
		  {
		    "__v": 0,
		    "_id": "53f489ce5cbdfbf854513e55",
		    "currentPrice": 16490,
		    "productImage": "http://img5a.flixcart.com/image/tablet/e/9/p/iball-slide-3gq1035-400x400-imadsfzxhgxfdkm8.jpeg",
		    "productName": "iBall Slide 3GQ1035 Tablet",
		    "productURL": "http://www.flipkart.com/dl/iball-slide-3gq1035-tablet/p/itmdsfzee4xpbaq7?affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 15999
		  },
		  {
		    "__v": 0,
		    "_id": "53f174bd33cd493627f5aba8",
		    "alertFromPrice": 2999,
		    "alertToPrice": 2650,
		    "currentPrice": 2650,
		    "productImage": "http://img5a.flixcart.com/image/speaker/multimedia-speakers/e/x/e/creative-sbs-a335-400x400-imadqz9nebcgzg4j.jpeg",
		    "productName": "Creative SBS A335 Multimedia Speakers",
		    "productURL": "http://www.flipkart.com/dl/creative-sbs-a335-multimedia-speakers/p/itmczzcahzh9zekg?pid=ACCCZZC9BDUM4EXE&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 872
		  },
		  {
		    "__v": 0,
		    "_id": "53f0789633cd493627f5ab9a",
		    "currentPrice": 5750,
		    "productImage": "http://img5a.flixcart.com/image/headset/7/j/t/jabra-sport-plus-400x400-imadqdbeynyh8zng.jpeg",
		    "productName": "Jabra Sport Plus In-the-ear Headset",
		    "productURL": "http://www.flipkart.com/dl/jabra-sport-plus-in-the-ear-headset/p/itmdqdajnajqa8ew?affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 5184
		  },
		  {
		    "__v": 0,
		    "_id": "53f043de33cd493627f5ab94",
		    "currentPrice": 6369,
		    "productImage": "http://img5a.flixcart.com/image/headset/y/r/4/jabra-motion-400x400-imadqdbfpbzknf6b.jpeg",
		    "productName": "Jabra Motion Bluetooth Mono Headset",
		    "productURL": "http://www.flipkart.com/dl/jabra-motion-bluetooth-mono-headset/p/itmdqdajdeptgbzh?affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 3600
		  },
		  {
		    "__v": 0,
		    "_id": "53edaa8ea681d76555b51192",
		    "currentPrice": 20000,
		    "productImage": "http://img6a.flixcart.com/image/graphics-card/s/3/j/asus-nvidia-gtx-760-direct-cuii-oc-2gb-gddr5-400x400-imadw765zgydh3bp.jpeg",
		    "productName": "Asus NVIDIA GTX 760 Direct CUII OC 2GB GDDR5 Graphics Card",
		    "productURL": "http://www.flipkart.com/dl/asus-nvidia-gtx-760-direct-cuii-oc-2gb-gddr5-graphics-card/p/itmdw75ztnuefcaf?pid=GRCDW75MBHFQMS3J&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 19680
		  },
		  {
		    "__v": 0,
		    "_id": "53edaa6ba681d76555b5118f",
		    "currentPrice": 34900,
		    "productImage": "http://img5a.flixcart.com/image/tablet/h/x/h/apple-32-gb-ipad-air-with-wi-fi-400x400-imadr69c3zbfbtfy.jpeg",
		    "productName": "Apple 16 GB iPad Air with Wi-Fi",
		    "productURL": "http://www.flipkart.com/dl/apple-16-gb-ipad-air-wi-fi/p/itmdxf63jdsrnwfz?pid=TABDR66PHYDWJHGF&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 29900
		  },
		  {
		    "__v": 0,
		    "_id": "53ed07e7a681d76555b5118c",
		    "currentPrice": 40850,
		    "productImage": "http://img5a.flixcart.com/image/mobile/f/3/z/htc-one-m8-400x400-imadvjf7fgpksper.jpeg",
		    "productName": "HTC One M8",
		    "productURL": "http://www.flipkart.com/dl/htc-one-m8/p/itmdvjyynzjdmrrh?pid=MOBDVJYPPX8UDF3Z&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 38999
		  },
		  {
		    "__v": 0,
		    "_id": "53e92965d42b9a3936625380",
		    "currentPrice": 7999,
		    "productImage": "http://img5a.flixcart.com//image/headset/z/c/w/jabra-supreme-400x400-imad4vrwymcfepjs.jpeg",
		    "productName": "Jabra Supreme On-the-ear Wireless Headset",
		    "productURL": "http://www.flipkart.com/dl/jabra-supreme-on-the-ear-wireless-headset/p/itmd4vqqzszdpf3j?pid=ACCD4VQNCHXHGZCW&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 4199
		  },
		  {
		    "__v": 0,
		    "_id": "53e8ccdbd42b9a3936625377",
		    "currentPrice": 323,
		    "productImage": "http://img5a.flixcart.com/image/book/6/5/9/the-fault-in-our-stars-400x400-imadgtvftvkbdzhz.jpeg",
		    "productName": "Fault in Our Stars (English)",
		    "productURL": "http://www.flipkart.com/dl/fault-our-stars-english/p/itmdxd5vbxf3jm5s?pid=9780141345659&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 155
		  },
		  {
		    "__v": 0,
		    "_id": "53e8ccaed42b9a3936625374",
		    "currentPrice": 409,
		    "productImage": "http://img6a.flixcart.com/image/book/8/9/8/the-book-thief-400x400-imadguwq9p7ejgru.jpeg",
		    "productName": "Book Thief (English)",
		    "productURL": "http://www.flipkart.com/dl/book-thief-english/p/itmdumvn5gvp9e3c?pid=9780552773898&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 272
		  },
		  {
		    "__v": 0,
		    "_id": "53e7a32e70dc2bb002455d03",
		    "currentPrice": 8063,
		    "productImage": "http://img6a.flixcart.com/image/external-hard-drive/x/z/k/wd-passport-ultra-400x400-imadqgvgbgk6q8zq.jpeg",
		    "productName": "WD Passport Ultra 2.5 inch 2 TB External Hard Drive",
		    "productURL": "http://www.flipkart.com/dl/wd-passport-ultra-2-5-inch-2-tb-external-hard-drive/p/itmdqhf9mjjxez6p?pid=ACCDQHF8CM3VGXZK&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 7398
		  },
		  {
		    "__v": 0,
		    "_id": "53e4501fae63c34f1c0cdd77",
		    "currentPrice": 699,
		    "productImage": "http://img6a.flixcart.com/image/book/6/9/3/lisp-400x400-imadbn69cekfv4m5.jpeg",
		    "productName": "LISP: An Introduction to the Language and its Application, 3rd ed. (English) 3rd Edition",
		    "productURL": "http://www.flipkart.com/dl/lisp-introduction-language-its-application-3rd-ed-english/p/itmduw6szwr8hvar?pid=9788177580693&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 699
		  },
		  {
		    "__v": 0,
		    "_id": "53e314f02cc88e197d67f536",
		    "currentPrice": 800,
		    "productImage": "http://img5a.flixcart.com/image/earring/q/u/h/pe1210-peora-stud-earring-400x400-imadqtmfvetpvpdp.jpeg",
		    "productName": "Peora Sterling Silver Stud Earring",
		    "productURL": "http://www.flipkart.com/dl/peora-sterling-silver-stud-earring/p/itmdqsqgsu4cn9sh?pid=ERGDQSQHTSKNZQUH&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 560
		  },
		  {
		    "__v": 0,
		    "_id": "53dcb685e4e943082f266f57",
		    "currentPrice": 11555,
		    "productImage": "http://img6a.flixcart.com/image/monitor/b/t/r/viewsonic-va2445-400x400-imadxnhgegbqeuhj.jpeg",
		    "productName": "Viewsonic 23.6 inch LED Backlit LCD - VA2445  Monitor",
		    "productURL": "http://www.flipkart.com/dl/viewsonic-23-6-inch-led-backlit-lcd-va2445-monitor/p/itmdxnj9suffn6eg?pid=MONDXNJ9EY7DSBTR&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 11555
		  },
		  {
		    "__v": 0,
		    "_id": "53db71398364ebbe2550bda1",
		    "currentPrice": 250,
		    "productImage": "http://img5a.flixcart.com/image/cases-covers/flip-cover/p/k/5/ncase-pfbc-8207bk-400x400-imadvzargz8jvv7h.jpeg",
		    "productName": "nCase Flip Cover for Micromax Canvas 4 A210",
		    "productURL": "http://www.flipkart.com/dl/ncase-flip-cover-micromax-canvas-4-a210/p/itmdvnym47krfwyp?pid=ACCDVNYGPCTGGPK5&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 250
		  },
		  {
		    "__v": 0,
		    "_id": "53db663d8364ebbe2550bd9c",
		    "currentPrice": 12499,
		    "productImage": "http://img5a.flixcart.com/image/mobile/n/q/a/motorola-moto-g-400x400-imadsmbwhznhucjj.jpeg",
		    "productName": "Moto G",
		    "productURL": "http://www.flipkart.com/dl/moto-g/p/itmdsmbxcrm9wy8r?pid=MOBDSGU2QFWMHGRR&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 10499
		  },
		  {
		    "__v": 0,
		    "_id": "53da72da8364ebbe2550bd99",
		    "currentPrice": 13490,
		    "productImage": "http://img6a.flixcart.com/image/mobile/n/q/a/motorola-moto-g-400x400-imadsmbwhznhucjj.jpeg",
		    "productName": "Moto G",
		    "productURL": "http://www.flipkart.com/dl/moto-g/p/itmdsmbxcrm9wy8r?pid=MOBDSGU2ZMDYENQA&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 2000
		  },
		  {
		    "__v": 0,
		    "_id": "53d51ee38ff6c6de59db2f9a",
		    "alertFromPrice": 399,
		    "alertToPrice": 250,
		    "currentPrice": 250,
		    "productImage": "http://img5a.flixcart.com/image/combo-gift-set/b/f/z/denim-400x400-imadybmfhercuv7r.jpeg",
		    "productName": "Denim Deo Combo Set",
		    "productURL": "http://www.flipkart.com/dl/denim-deo-combo-set/p/itmdtfstyfyqzurj?pid=CAGDTFSHTF6TRBFZ&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 199
		  },
		  {
		    "__v": 0,
		    "_id": "53d394ecd831273036964d4f",
		    "currentPrice": 1495,
		    "productImage": "http://img6a.flixcart.com/image/t-shirt/g/c/u/12077507-cloud-dancer-jack-jones-m-400x400-imadyc37t3f4fhzh.jpeg",
		    "productName": "Jack & Jones Striped Men's Polo Neck T-Shirt",
		    "productURL": "http://www.flipkart.com/dl/jack-jones-striped-men-s-polo-neck-t-shirt/p/itmdxnapccjpfne4?pid=TSHDXNABG6XSRDFF&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 897
		  },
		  {
		    "__v": 0,
		    "_id": "53d07d369d5473d05d00000c",
		    "currentPrice": 999,
		    "productImage": "http://img6a.flixcart.com/image/cases-covers/flip-cover/6/u/d/motorola-flip-shells-400x400-imadtfzczwjvkf3c.jpeg",
		    "productName": "Motorola Flip Cover for Moto G",
		    "productURL": "http://www.flipkart.com/dl/motorola-flip-cover-moto-g/p/itmdv5d8gnnpbngh?affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 199
		  },
		  {
		    "__v": 0,
		    "_id": "53cff9664fa5f0755c00002f",
		    "currentPrice": 24999,
		    "productImage": "http://img6a.flixcart.com/image/mobile/x/e/g/nokia-lumia-920-400x400-imadjzfnfccypgmw.jpeg",
		    "productName": "Nokia Lumia 920",
		    "productURL": "http://www.flipkart.com/dl/nokia-lumia-920/p/itmdv6f4udtzgzsb?affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 10000
		  },
		  {
		    "__v": 0,
		    "_id": "53cf864e654159a553000003",
		    "currentPrice": 2295,
		    "productImage": "http://img5a.flixcart.com/image/raincoat/e/w/s/rain-jacket-black-wildcraft-m-400x400-imadh9w6thgwyfh7.jpeg",
		    "productName": "Wildcraft Solid Men's Raincoat",
		    "productURL": "http://www.flipkart.com/dl/wildcraft-solid-men-s-raincoat/p/itmdkfrhcnsby2ec?pid=RNCDKFRHTHGEZBA9&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 2295
		  },
		  {
		    "__v": 0,
		    "_id": "53ce9fb3ce871d104c000033",
		    "currentPrice": 419,
		    "productImage": "http://img5a.flixcart.com/image/book/3/9/1/the-gun-seller-400x400-imadxfhahvchycuz.jpeg",
		    "productName": "The Gun Seller (English)",
		    "productURL": "http://www.flipkart.com/dl/gun-seller-english/p/itmdun4w6h5epvje?pid=9780099469391&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 375
		  },
		  {
		    "__v": 0,
		    "_id": "53ce93aace871d104c000029",
		    "currentPrice": 13999,
		    "productImage": "http://img6a.flixcart.com/image/mobile/k/8/j/mi-mi3-400x400-imady54gkp5zt5hs.jpeg",
		    "productName": "Mi3",
		    "productURL": "http://www.flipkart.com/dl/mi3/p/itmdxsvrrerjhztf?pid=MOBDXSVH7HHHNK8J&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 13999
		  },
		  {
		    "__v": 0,
		    "_id": "53ce7930ce871d104c000014",
		    "currentPrice": 3999,
		    "productImage": "http://img5a.flixcart.com/image/av-media/games/k/c/y/destiny-400x400-imadw6fzg6mxdmpn.jpeg",
		    "productName": "Destiny",
		    "productURL": "http://www.flipkart.com/dl/destiny/p/itmdxh3bkwfgjb9n?pid=AVMDW5FVCM4ZZKCY&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 3999
		  },
		  {
		    "__v": 0,
		    "_id": "53ce7601ce871d104c000010",
		    "currentPrice": 55099,
		    "productImage": "http://img5a.flixcart.com/image/computer/r/z/g/apple-macbook-air-netbook-400x400-imadwdzsqzuktbz6.jpeg",
		    "productName": "Apple MD711HN/B MacBook Air (Ci5/ 4GB/ 128GB Flash/ Mac OS X Mavericks)",
		    "productURL": "http://www.flipkart.com/dl/apple-md711hn-b-macbook-air-ci5-4gb-128gb-flash-mac-os-x-mavericks/p/itmdwdybu4hfhgqa?pid=COMDWDY8JBXJXRZG&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 49990
		  },
		  {
		    "__v": 0,
		    "_id": "53ce6ddfce871d104c000003",
		    "currentPrice": 47975,
		    "productImage": "http://img6a.flixcart.com/image/computer/4/v/z/lenovo-thinkpad-400x400-imads7gkygezsd6m.jpeg",
		    "productName": "Lenovo Thinkpad L Series Laptop (3rd Gen Ci5/ 6 GB/ 500GB/ Dos)",
		    "productURL": "http://www.flipkart.com/dl/lenovo-thinkpad-l-series-laptop-3rd-gen-ci5-6-gb-500gb-dos/p/itmds6vaghsdknxn?pid=COMDS6V9XVZRW4VZ&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 47975
		  },
		  {
		    "__v": 0,
		    "_id": "53ce64c036000efe48000014",
		    "currentPrice": 999,
		    "productImage": "http://img5a.flixcart.com/image/cases-covers/tpu/x/8/8/rearth-ringke-fusion-google-lg-nexus-4-e960-400x400-imadqb7xzcxdustq.jpeg",
		    "productName": "Rearth Case for Google LG Nexus 4 E960",
		    "productURL": "http://www.flipkart.com/dl/rearth-case-google-lg-nexus-4-e960/p/itmdqb5yku6j4rsv?pid=ACCDQB5XZJYEFX88&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 999
		  },
		  {
		    "__v": 0,
		    "_id": "53c7d7d4389c97fe67000009",
		    "currentPrice": 8840,
		    "productImage": "http://img6a.flixcart.com/image/shoe/n/y/a/flash-yellow-b-shoes-shb-01-ltd-yonex-10-400x400-imadvghhvntyhtgh.jpeg",
		    "productName": "Yonex B Shoes Shb 01 Ltd Badminton Shoes",
		    "productURL": "http://www.flipkart.com/dl/yonex-b-shoes-shb-01-ltd-badminton/p/itmduu2yefdhrhf2?pid=SHODUGRKKZUBAHHM&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 6630
		  },
		  {
		    "__v": 0,
		    "_id": "53bfd919c60c07ec39000003",
		    "currentPrice": 991,
		    "productImage": "http://img5a.flixcart.com//image/router/x/h/4/tp-link-150mbps-wireless-n-400x400-imad7hnetyc2myfz.jpeg",
		    "productName": "TP-LINK TL-WR740N 150Mbps Wireless N Router",
		    "productURL": "http://www.flipkart.com/dl/tp-link-tl-wr740n-150mbps-wireless-n-router/p/itmdrmmgfwnyhzvy?pid=RTRD7HN3B2FKYXH4&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 699
		  },
		  {
		    "__v": 0,
		    "_id": "53c4c502be4c944d25000023",
		    "currentPrice": 3549,
		    "productImage": "http://img5a.flixcart.com/image/power-hand-tool-kit/v/v/g/gsb-500-re-kit-bosch-400x400-imadv2z5mtkwf6pj.jpeg",
		    "productName": "Bosch GSB 500 RE Kit Power & Hand Tool Kit",
		    "productURL": "http://www.flipkart.com/dl/bosch-gsb-500-re-kit-power-hand-tool/p/itmdtwyyqpqhsvvg?pid=PHTDTWYYQPQHSVVG&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 2720
		  },
		  {
		    "__v": 0,
		    "_id": "53bf42c05649660a23000019",
		    "currentPrice": 38490,
		    "productImage": "http://img5a.flixcart.com/image/computer/h/y/2/hp-pavilion-notebook-15-g004au-400x400-imadxsz9fgkskzma.jpeg",
		    "productName": "HP 15-d103tx Notebook (4th Gen Ci5/ 4GB/ 500GB/ Free DOS/ 2GB Graph)",
		    "productURL": "http://www.flipkart.com/dl/hp-15-d103tx-notebook-4th-gen-ci5-4gb-500gb-free-dos-2gb-graph/p/itmdvmxrb4pkqws2?pid=COMDVMWQJGDQTFSB&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 38490
		  },
		  {
		    "__v": 0,
		    "_id": "53be8e255649660a23000013",
		    "alertFromPrice": 38490,
		    "alertToPrice": 37299,
		    "currentPrice": 39990,
		    "productImage": "http://img6a.flixcart.com/image/gamingconsole/g/a/t/400x400-imadrhehpvvetkgf.jpeg",
		    "productName": "Sony PlayStation 4 (PS4)",
		    "productURL": "http://www.flipkart.com/dl/sony-playstation-4-ps4/p/itmdrnshthv9egmf?pid=GMCDNZCHPFVHKGAT&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 36490
		  },
		  {
		    "__v": 0,
		    "_id": "53baea78aca18e447c000008",
		    "currentPrice": 600,
		    "productImage": "http://img5a.flixcart.com/image/speaker/usb-speakers/6/j/c/digiflip-ps012-400x400-imadumg69jscqxpg.jpeg",
		    "productName": "DigiFlip PS012 Wired Mini USB Speaker",
		    "productURL": "http://www.flipkart.com/dl/digiflip-ps012-wired-mini-usb-speaker/p/itmdtgbfk3bj7wtn?pid=ACCDPGQNMDHZY6JC&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 444
		  },
		  {
		    "__v": 0,
		    "_id": "53bae500aca18e447c000005",
		    "currentPrice": 359,
		    "productImage": "http://img5a.flixcart.com/image/mouse/z/6/n/digiflip-wm001-400x400-imadxty7dvsj8tqd.jpeg",
		    "productName": "DigiFlip WM001 Wireless Optical Mouse with Adjustable DPI",
		    "productURL": "http://www.flipkart.com/dl/digiflip-wm001-wireless-optical-mouse-adjustable-dpi/p/itmdun9rvxgcd44g?pid=ACCDJKUMGMHZMZ6N&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 268
		  },
		  {
		    "__v": 0,
		    "_id": "53bad01286a7716f7600000c",
		    "alertFromPrice": 23990,
		    "alertToPrice": 23490,
		    "currentPrice": 23490,
		    "productImage": "http://img6a.flixcart.com/image/tablet/h/s/m/samsung-galaxy-tab-4-t331-400x400-imadwsh8hzyvpgyk.jpeg",
		    "productName": "Samsung Galaxy Tab 4 T331 Tablet",
		    "productURL": "http://www.flipkart.com/dl/samsung-galaxy-tab-4-t331-tablet/p/itmdxf65jjczgzhu?pid=TABDWMJAABHYZHSM&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 22280
		  },
		  {
		    "__v": 0,
		    "_id": "53bacffa86a7716f7600000a",
		    "currentPrice": 359,
		    "productImage": "http://img5a.flixcart.com/image/mouse/e/x/j/digiflip-wm001-400x400-imadxty3cfkm9yd6.jpeg",
		    "productName": "DigiFlip WM001 Wireless Optical Mouse with Adjustable DPI",
		    "productURL": "http://www.flipkart.com/dl/digiflip-wm001-wireless-optical-mouse-adjustable-dpi/p/itmdun9rvxgcd44g?pid=ACCDFWBQYCG2UEXJ&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 268
		  },
		  {
		    "__v": 0,
		    "_id": "53ba85b54731ab846b000017",
		    "currentPrice": 6999,
		    "productImage": "http://img5a.flixcart.com/image/mobile/3/g/z/motorola-xt1022-400x400-imadvvfknshcywk5.jpeg",
		    "productName": "Moto E",
		    "productURL": "http://www.flipkart.com/dl/moto-e/p/itmdvuwsybgnbtha?pid=MOBDVHC6XKKPZ3GZ&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1500
		  },
		  {
		    "__v": 0,
		    "_id": "53b9aebe4731ab846b000006",
		    "currentPrice": 115999,
		    "productImage": "http://img6a.flixcart.com/image/computer/5/d/g/apple-macbook-pro-400x400-imadpxqbkzbx37dh.jpeg",
		    "productName": "Apple Macbook Pro Laptop",
		    "productURL": "http://www.flipkart.com/dl/apple-macbook-pro-laptop/p/itmdpxq5thqnk3yw?pid=COMDPXQ5NZCSTJ8Y&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 96578
		  },
		  {
		    "__v": 0,
		    "_id": "53b9a3084731ab846b000002",
		    "currentPrice": 5046,
		    "productImage": "http://img5a.flixcart.com/image/battery-charger/usb-charger/t/2/6/promate-storm-15-400x400-imadt37zhg8egaym.jpeg",
		    "productName": "Promate Storm.15 Charger",
		    "productURL": "http://www.flipkart.com/dl/promate-storm-15-charger/p/itmdt33tpr9czjpt?pid=ACCDT32RDVHYHT26&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 3054
		  },
		  {
		    "__v": 0,
		    "_id": "53b91b83c50533106400002f",
		    "currentPrice": 2439,
		    "productImage": "http://img5a.flixcart.com/image/shoe/z/q/g/black-brit-cobalt-puma-silver-187189kap-puma-8-400x400-imaduzzdvuxg3frk.jpeg",
		    "productName": "Puma Shintai Runner Ind. Running Shoes",
		    "productURL": "http://www.flipkart.com/dl/puma-shintai-runner-ind-running-shoes/p/itmduzt8jt4tqumf?pid=SHODUZT8QTBXTWF5&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 2399
		  },
		  {
		    "__v": 0,
		    "_id": "53b91a1cc50533106400001e",
		    "currentPrice": 5246,
		    "productImage": "http://img6a.flixcart.com/image/shoe/q/z/v/303-599075-nike-8-400x400-imadv7mckzfuhbwv.jpeg",
		    "productName": "Nike Hypervenom Phatal FG Football Studs",
		    "productURL": "http://www.flipkart.com/dl/nike-hypervenom-phatal-fg-football-studs/p/itmdtkkhgtwgrznt?pid=SHODTKKKM9DFFHWH&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 5246
		  },
		  {
		    "__v": 0,
		    "_id": "53b91a1bc505331064000017",
		    "currentPrice": 399,
		    "productImage": "http://img6a.flixcart.com/image/diary-notebook/9/c/d/zequenz-zq006-zq006-400x400-imadhmfzngzjmmuw.jpeg",
		    "productName": "Zequenz Classic Lite A5 (Large) Journal Glue Binding",
		    "productURL": "http://www.flipkart.com/dl/zequenz-classic-lite-a5-large-journal-glue-binding/p/itmd8edk5hkq2zh9?pid=DIAD8EDK5HKQ2ZH9&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 399
		  },
		  {
		    "__v": 0,
		    "_id": "53b91a1bc505331064000011",
		    "currentPrice": 435,
		    "productImage": "http://img5a.flixcart.com/image/cases-covers/flip-cover/n/x/p/ncase-pfbc-p8580pl-400x400-imadsfep4nhnnkdv.jpeg",
		    "productName": "nCase Flip Cover for Nokia Lumia 525",
		    "productURL": "http://www.flipkart.com/dl/ncase-flip-cover-nokia-lumia-525/p/itmdsfeby7grnfae?pid=ACCDSFEBQ5MKGNXP&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 392
		  },
		  {
		    "__v": 0,
		    "_id": "53b91a1bc50533106400000e",
		    "currentPrice": 1599,
		    "productImage": "http://img6a.flixcart.com/image/t-shirt/e/u/w/47283-0002-levi-s-m-400x400-imadx6uuwfnydqhh.jpeg",
		    "productName": "Levi's Striped Men's Henley T-Shirt",
		    "productURL": "http://www.flipkart.com/dl/levi-s-striped-men-s-henley-t-shirt/p/itmdwk3qtqjfefsj?pid=TSHDWK3QDYWKGZAZ&affid=aakashlpi",
		    "eyes": 1,
		    "seller": "flipkart",
		    "ltp": 1119
		  },
		  {
		    "currentPrice": 1012,
		    "productURL": "http://www.amazon.in/dp/B00MA6R05K?tag=cheapass0a-21",
		    "productImage": "http://ecx.images-amazon.com/images/I/31E0s3QHTqL._SX342_.jpg",
		    "productName": "PEPE JEANS Aviator Sunglasses (Black) (S5078 C1)",
		    "_id": "543a63fc6815e87c2a8c76e0",
		    "__v": 0,
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 1012
		  },
		  {
		    "__v": 0,
		    "_id": "543a04de9b925cde753ee505",
		    "currentPrice": 449,
		    "productImage": "http://ecx.images-amazon.com/images/I/51ni-32uV2L._SX300_.jpg",
		    "productName": "Tom Beanie Ball, 11cm",
		    "productURL": "http://www.amazon.in/dp/B00FTZXUJE?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 449
		  },
		  {
		    "__v": 0,
		    "_id": "5439a8389b925cde753ee4e8",
		    "currentPrice": 9898,
		    "productImage": "http://ecx.images-amazon.com/images/I/416YCEh2LTL._SX300_.jpg",
		    "productName": "TPLINK ARCHER C7 AC1750 Wireless Dual Band Gigabit Router",
		    "productURL": "http://www.amazon.in/dp/B00BUSDVBQ?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 9898
		  },
		  {
		    "__v": 0,
		    "_id": "5439a8309b925cde753ee4e6",
		    "currentPrice": 12796,
		    "productImage": "http://ecx.images-amazon.com/images/I/31yLuZdfvbL.jpg",
		    "productName": "LG L90 Dual D410 (White)",
		    "productURL": "http://www.amazon.in/dp/B00JFOIOPU?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 12697
		  },
		  {
		    "__v": 0,
		    "_id": "5439a8289b925cde753ee4e4",
		    "currentPrice": 10748,
		    "productImage": "http://ecx.images-amazon.com/images/I/31zqX79O7AL.jpg",
		    "productName": "Sennheiser RS 160 Digital Wireless Over-Ear Headphone (Black)",
		    "productURL": "http://www.amazon.in/dp/B002SOU2Y0?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 10748
		  },
		  {
		    "__v": 0,
		    "_id": "5439a8209b925cde753ee4e2",
		    "currentPrice": 7000,
		    "productImage": "http://ecx.images-amazon.com/images/I/41SHfmHRYJL._SY300_.jpg",
		    "productName": "Sennheiser HDR 160 Wireless Over-Ear Headphone",
		    "productURL": "http://www.amazon.in/dp/B003V9NYCI?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 7000
		  },
		  {
		    "__v": 0,
		    "_id": "5439a7d89b925cde753ee4e0",
		    "currentPrice": 1931,
		    "productImage": "http://ecx.images-amazon.com/images/I/31zBDSoGrJL._SY300_.jpg",
		    "productName": "Huawei E8231 Data Card",
		    "productURL": "http://www.amazon.in/dp/B00I07U3LG?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 1931
		  },
		  {
		    "__v": 0,
		    "_id": "54389ead9e305cd861ebb58c",
		    "currentPrice": 749,
		    "productImage": "http://ecx.images-amazon.com/images/I/51-YU-6KSJL._SY300_.jpg",
		    "productName": "Ty Beanie Boo Buddy Tangerine Orangutan",
		    "productURL": "http://www.amazon.in/dp/B003XT7E40?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 562
		  },
		  {
		    "__v": 0,
		    "_id": "5437d98d9e305cd861ebb583",
		    "currentPrice": 273,
		    "productImage": "http://ecx.images-amazon.com/images/I/418a1yrDmLL._SY344_BO1,204,203,200_.jpg",
		    "productName": "Gone Girl",
		    "productURL": "http://www.amazon.in/dp/1780221355?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 273
		  },
		  {
		    "__v": 0,
		    "_id": "5437ae349e305cd861ebb574",
		    "currentPrice": 194,
		    "productImage": "http://ecx.images-amazon.com/images/I/51PUmU8XduL._SY344_BO1,204,203,200_.jpg",
		    "productName": "The Wee Free Men: (Discworld Novel 30) (Discworld Novels)",
		    "productURL": "http://www.amazon.in/dp/0552549053?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 194
		  },
		  {
		    "__v": 0,
		    "_id": "5437add09e305cd861ebb572",
		    "currentPrice": 5999,
		    "productImage": "http://g-ecx.images-amazon.com/images/G/31/kindle/dp/kb-slate-01-lg-novid._V325433047_.jpg",
		    "productName": "All-New Kindle, 6\" Glare-Free Touchscreen Display, Wi-Fi",
		    "productURL": "http://www.amazon.in/dp/B00KDRQ2RU?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 5999
		  },
		  {
		    "__v": 0,
		    "_id": "5437ad319e305cd861ebb570",
		    "currentPrice": 220,
		    "productImage": "http://ecx.images-amazon.com/images/I/51lYreoljJL._SY344_BO1,204,203,200_.jpg",
		    "productName": "The Folklore of Discworld",
		    "productURL": "http://www.amazon.in/dp/0552154938?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 220
		  },
		  {
		    "__v": 0,
		    "_id": "54377e539e305cd861ebb568",
		    "currentPrice": 56748,
		    "productImage": "http://ecx.images-amazon.com/images/I/31le8Z4JFFL._SX300_.jpg",
		    "productName": "Apple MacBook Pro MD101HN/A 13-inch Laptop",
		    "productURL": "http://www.amazon.in/dp/B00DKMCB20?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 56450
		  },
		  {
		    "__v": 0,
		    "_id": "543765889e305cd861ebb55d",
		    "currentPrice": 62000,
		    "productImage": "http://ecx.images-amazon.com/images/I/51EKMmNT2%2BL._SY300_.jpg",
		    "productName": "Nikon D5300 Digital SLR Camera (Black) with 18-55 VR Lens and AF-S DX VR Zoom-NIKKOR 55-200mm f/4-5.6G IF-ED Twin Lens 4GB Card, Camera Bag",
		    "productURL": "http://www.amazon.in/dp/B00I4SFZE6?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 62000
		  },
		  {
		    "__v": 0,
		    "_id": "543757c59e305cd861ebb559",
		    "currentPrice": 8290,
		    "productImage": "http://ecx.images-amazon.com/images/I/21uwEOCjFoL.jpg",
		    "productName": "Onida Microwave Oven 20L MO20CJP27B",
		    "productURL": "http://www.amazon.in/dp/B00FQIW09A?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 8290
		  },
		  {
		    "__v": 0,
		    "_id": "54374aea9e305cd861ebb553",
		    "currentPrice": 4199,
		    "productImage": "http://ecx.images-amazon.com/images/I/61154r1CRwL._SY300_.jpg",
		    "productName": "Kinect Sports Rivals (Xbox One)",
		    "productURL": "http://www.amazon.in/dp/B00M7TIK7W?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 4199
		  },
		  {
		    "__v": 0,
		    "_id": "5436fe969e305cd861ebb551",
		    "currentPrice": 20657,
		    "productImage": "http://ecx.images-amazon.com/images/I/414XYshXY2L._SX300_.jpg",
		    "productName": "BenQ XL2411Z 24-inch LED Monitor",
		    "productURL": "http://www.amazon.in/dp/B00HZF2JWA?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 20656
		  },
		  {
		    "__v": 0,
		    "_id": "5436d8429e305cd861ebb54f",
		    "currentPrice": 6499,
		    "productImage": "http://ecx.images-amazon.com/images/I/41jZ6NbCnDL._SY300_.jpg",
		    "productName": "Micromax Canvas A1 with Android One (Magnetic Black)",
		    "productURL": "http://www.amazon.in/dp/B00NEFFWF6?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 6498
		  },
		  {
		    "__v": 0,
		    "_id": "5436d0c19e305cd861ebb54d",
		    "alertFromPrice": 31450,
		    "alertToPrice": 31099,
		    "currentPrice": 31099,
		    "productImage": "http://ecx.images-amazon.com/images/I/41og%2B-WZh6L._SX300_.jpg",
		    "productName": "Nikon D3300 24.2 MP Digital SLR Camera (Black) with 18-55mm VR II Lens Kit with 8GB Card and Camera Bag",
		    "productURL": "http://www.amazon.in/dp/B00JM4WAPS?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 25696
		  },
		  {
		    "__v": 0,
		    "_id": "5436bfd09e305cd861ebb548",
		    "currentPrice": 23080,
		    "productImage": "http://ecx.images-amazon.com/images/I/51BpvoWQUbL._SY300_.jpg",
		    "productName": "HTC Desire 816 Dual Sim (Dark Grey)",
		    "productURL": "http://www.amazon.in/dp/B00KC86AZY?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 22650
		  },
		  {
		    "__v": 0,
		    "_id": "5436ba139e305cd861ebb546",
		    "alertFromPrice": 989,
		    "alertToPrice": 875,
		    "currentPrice": 875,
		    "productImage": "http://ecx.images-amazon.com/images/I/51WxxIqNx6L._SX258_BO1,204,203,200_.jpg",
		    "productName": "Divergent Series Boxed Set",
		    "productURL": "http://www.amazon.in/dp/0007538049?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 549
		  },
		  {
		    "__v": 0,
		    "_id": "543677f39e305cd861ebb53d",
		    "currentPrice": 5821,
		    "productImage": "http://ecx.images-amazon.com/images/I/418SwCvOibL._SY300_.jpg",
		    "productName": "Jabra SPORT+ Wireless Bluetooth Stereo Headphones - Black",
		    "productURL": "http://www.amazon.in/dp/B00DV9O0GC?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 5821
		  },
		  {
		    "__v": 0,
		    "_id": "543651e624977d4c11ca29d6",
		    "alertFromPrice": 3699,
		    "alertToPrice": 3499,
		    "currentPrice": 3499,
		    "productImage": "http://ecx.images-amazon.com/images/I/41crq3T0pAL._SY300_.jpg",
		    "productName": "Bosch GSB 500 RE 500-Watt Tool Set (Blue",
		    "productURL": "http://www.amazon.in/dp/B00INTGY6O?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 3499
		  },
		  {
		    "__v": 0,
		    "_id": "5436413524977d4c11ca29d0",
		    "alertFromPrice": 179,
		    "alertToPrice": 133,
		    "currentPrice": 133,
		    "productImage": "http://ecx.images-amazon.com/images/I/41IlUolYhXL._SY300_.jpg",
		    "productName": "letsgrab 8 in 1 Multi-function Screwdriver Kit, Tool Kit Set + 6 LED light Torch",
		    "productURL": "http://www.amazon.in/dp/B00A6MLIHQ?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 133
		  },
		  {
		    "__v": 0,
		    "_id": "54362fae24977d4c11ca29cd",
		    "currentPrice": 914,
		    "productImage": "http://ecx.images-amazon.com/images/I/51tpSlTgyML._SX258_BO1,204,203,200_.jpg",
		    "productName": "James Bond: Omnibus Volume 001: Based on the novels that inspired the movies (James Bond Graphic Novels)",
		    "productURL": "http://www.amazon.in/dp/1848563647?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 892
		  },
		  {
		    "__v": 0,
		    "_id": "5435a2c424977d4c11ca29bd",
		    "currentPrice": 450,
		    "productImage": "http://ecx.images-amazon.com/images/I/51sXi-6wCKL._SY344_BO1,204,203,200_.jpg",
		    "productName": "India at Turning Point, the Road to Good Governance",
		    "productURL": "http://www.amazon.in/dp/8129130874?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 450
		  },
		  {
		    "__v": 0,
		    "_id": "54359cf124977d4c11ca29bb",
		    "alertFromPrice": 7299,
		    "alertToPrice": 7037,
		    "currentPrice": 7048,
		    "productImage": "http://ecx.images-amazon.com/images/I/51diKGvW4yL._SY300_.jpg",
		    "productName": "Micromax Canvas 2.2 A114 (White)",
		    "productURL": "http://www.amazon.in/dp/B00HF4VOPY?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 7011
		  },
		  {
		    "__v": 0,
		    "_id": "543508b224977d4c11ca29a9",
		    "currentPrice": 88299,
		    "productImage": "http://ecx.images-amazon.com/images/I/31le8Z4JFFL._SX300_.jpg",
		    "productName": "Apple MacBook Pro MGX72HN/A 13-Inch Laptop",
		    "productURL": "http://www.amazon.in/dp/B00MOGJPA4?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 88299
		  },
		  {
		    "__v": 0,
		    "_id": "5435077924977d4c11ca29a5",
		    "currentPrice": 123500,
		    "productImage": "http://ecx.images-amazon.com/images/I/31YTw5CpR9L._SX300_.jpg",
		    "productName": "Apple MacBook Pro MGX92HN/A 13-Inch Laptop",
		    "productURL": "http://www.amazon.in/dp/B00MOGJUR2?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 119000
		  },
		  {
		    "__v": 0,
		    "_id": "5435072424977d4c11ca29a1",
		    "currentPrice": 104500,
		    "productImage": "http://ecx.images-amazon.com/images/I/31YTw5CpR9L._SX300_.jpg",
		    "productName": "Apple MacBook Pro MGX82HN/A 13-Inch Laptop",
		    "productURL": "http://www.amazon.in/dp/B00MOGJSSI?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 99206
		  },
		  {
		    "__v": 0,
		    "_id": "5433fac487adc5161cce8a0b",
		    "currentPrice": 1795,
		    "productImage": "http://ecx.images-amazon.com/images/I/51um9im-ZYL._SY395_.jpg",
		    "productName": "Crocs Girls CC Dora Butterfly Clogs and Mules",
		    "productURL": "http://www.amazon.in/dp/B008J0Y3AQ?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 1077
		  },
		  {
		    "__v": 0,
		    "_id": "5433c34087adc5161cce89f7",
		    "alertFromPrice": 8750,
		    "alertToPrice": 7599,
		    "currentPrice": 7549,
		    "productImage": "http://ecx.images-amazon.com/images/I/41Qj9WTrV6L._SX300_.jpg",
		    "productName": "Nikon AF-S Nikkor 50mm f/1.8G Prime Lens for Nikon DSLR Camera",
		    "productURL": "http://www.amazon.in/dp/B004Y1AYAC?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 7549
		  },
		  {
		    "__v": 0,
		    "_id": "5433aab287adc5161cce89ed",
		    "alertFromPrice": 649,
		    "alertToPrice": 399,
		    "currentPrice": 399,
		    "productImage": "http://ecx.images-amazon.com/images/I/41HJuFcUc7L._SY300_.jpg",
		    "productName": "SanDisk Cruzer Orbit Rotating 16GB USB Pen Drive (Black/Chrome)",
		    "productURL": "http://www.amazon.in/dp/B00BPHNEKU?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 320
		  },
		  {
		    "__v": 0,
		    "_id": "5433a4a487adc5161cce89eb",
		    "currentPrice": 2067,
		    "productImage": "http://ecx.images-amazon.com/images/I/31uCnp03DVL._SY300_.jpg",
		    "productName": "Philips BG2024/15 Body Groom Shaver",
		    "productURL": "http://www.amazon.in/dp/B008MWO1A8?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 2023
		  },
		  {
		    "__v": 0,
		    "_id": "5433a48087adc5161cce89e9",
		    "currentPrice": 2548,
		    "productImage": "http://ecx.images-amazon.com/images/I/41n0j0kJ%2BjL._SY300_.jpg",
		    "productName": "Philips AquaTouch AT756/16 Men's Shaver",
		    "productURL": "http://www.amazon.in/dp/B00CE3FUGK?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 2449
		  },
		  {
		    "__v": 0,
		    "_id": "5433991187adc5161cce89e5",
		    "currentPrice": 4030,
		    "productImage": "http://ecx.images-amazon.com/images/I/31FoT3C8SiL._SY300_.jpg",
		    "productName": "Seagate Expansion 1TB Portable External Hard Drive",
		    "productURL": "http://www.amazon.in/dp/B009PJG3MQ?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 3899
		  },
		  {
		    "__v": 0,
		    "_id": "54338b4b87adc5161cce89dc",
		    "alertFromPrice": 38295,
		    "alertToPrice": 36695,
		    "currentPrice": 36695,
		    "productImage": "http://ecx.images-amazon.com/images/I/41jj8vliejL._SX300_.jpg",
		    "productName": "Nikon D5200 24.1MP Digital SLR Camera (Black) with AF-S 18-55 mm VR Kit Lens, Memory Card, Camera Bag",
		    "productURL": "http://www.amazon.in/dp/B00CTK68T6?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 32699
		  },
		  {
		    "__v": 0,
		    "_id": "5433881787adc5161cce89d6",
		    "alertFromPrice": 38295,
		    "alertToPrice": 30890,
		    "currentPrice": 36700,
		    "productImage": "http://ecx.images-amazon.com/images/I/41jj8vliejL._SX300_.jpg",
		    "productName": "Nikon D5200 24.1MP Digital SLR Camera (Black) with AF-S 18-55 mm VR Kit Lens, Memory Card, Camera Bag",
		    "productURL": "http://www.amazon.in/dp/B00JM4VAC2?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 30890
		  },
		  {
		    "__v": 0,
		    "_id": "5432ea7512678c1757c63ea9",
		    "alertFromPrice": 9549,
		    "alertToPrice": 7947,
		    "currentPrice": 9549,
		    "productImage": "http://ecx.images-amazon.com/images/I/51SB8h6hbKL._SY300_.jpg",
		    "productName": "DELL S2240L 21.5 IN LED",
		    "productURL": "http://www.amazon.in/dp/B009MXKJ2A?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 7799
		  },
		  {
		    "__v": 0,
		    "_id": "54325b3312678c1757c63e68",
		    "currentPrice": 1290,
		    "productImage": "http://ecx.images-amazon.com/images/I/31oNVbCyNmL._SX300_.jpg",
		    "productName": "Logitech G300 Wired Gaming Mouse",
		    "productURL": "http://www.amazon.in/dp/B008QS8XB6?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 1289
		  },
		  {
		    "__v": 0,
		    "_id": "5432542d12678c1757c63e62",
		    "alertFromPrice": 17499,
		    "alertToPrice": 16949,
		    "currentPrice": 16888,
		    "productImage": "http://ecx.images-amazon.com/images/I/41O86veyKuL._SY300_.jpg",
		    "productName": "Apple iPad Mini (WiFi, 16GB, Space Grey)",
		    "productURL": "http://www.amazon.in/dp/B00HMMUA9A?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 15888
		  },
		  {
		    "__v": 0,
		    "_id": "5431fa0712678c1757c63e36",
		    "currentPrice": 2409,
		    "productImage": "http://ecx.images-amazon.com/images/I/41d0OYEmnEL._SY300_.jpg",
		    "productName": "Logitech B530 USB Headset - headset",
		    "productURL": "http://www.amazon.in/dp/B004YRTZ4C?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 2409
		  },
		  {
		    "__v": 0,
		    "_id": "54319d9512678c1757c63e18",
		    "currentPrice": 4095,
		    "productImage": "http://ecx.images-amazon.com/images/I/41lTdxkVDnL._SX300_.jpg",
		    "productName": "Jabra Sport + Bluetooth Headphone",
		    "productURL": "http://www.amazon.in/dp/B00GAXL2CQ?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 4088
		  },
		  {
		    "__v": 0,
		    "_id": "54319d2912678c1757c63e16",
		    "alertFromPrice": 5690,
		    "alertToPrice": 5092,
		    "currentPrice": 5690,
		    "productImage": "http://ecx.images-amazon.com/images/I/41uQy6DrTGL._SX300_.jpg",
		    "productName": "Plantronics Voyager Edge Bluetooth Headset with Charge Case (Black)",
		    "productURL": "http://www.amazon.in/dp/B00KAZUUP0?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 5092
		  },
		  {
		    "__v": 0,
		    "_id": "542c63e3afccee9d69f58e0c",
		    "currentPrice": 37600,
		    "productImage": "http://ecx.images-amazon.com/images/I/21YEAuwUsLL.jpg",
		    "productName": "SAMSUNG GALAXY TAB S SM-T705",
		    "productURL": "http://www.amazon.in/dp/B00M61Y0C0?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 37600
		  },
		  {
		    "__v": 0,
		    "_id": "542af5df6bf0cefc598d42a1",
		    "alertFromPrice": 547,
		    "alertToPrice": 445,
		    "currentPrice": 646,
		    "productImage": "http://ecx.images-amazon.com/images/I/31rSuzlZlvL._SY300_.jpg",
		    "productName": "Philips Tuned for Sports in-ear sports headphones-Gray",
		    "productURL": "http://www.amazon.in/dp/B008ZW2X0U?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 445
		  },
		  {
		    "__v": 0,
		    "_id": "542af5bf6bf0cefc598d429f",
		    "alertFromPrice": 2481,
		    "alertToPrice": 1917,
		    "currentPrice": 1917,
		    "productImage": "http://ecx.images-amazon.com/images/I/41cu5CAHifL._SX300_.jpg",
		    "productName": "Sony MDR-XB50AP/L Extra Bass (XB) In-Ear Headphones with In-Line Mic & Remote",
		    "productURL": "http://www.amazon.in/dp/B00JE0AQPG?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 1917
		  },
		  {
		    "__v": 0,
		    "_id": "542af4466bf0cefc598d429b",
		    "currentPrice": 149,
		    "productImage": "http://ecx.images-amazon.com/images/I/412MdrdkEDL._SY344_BO1,204,203,200_.jpg",
		    "productName": "Adultery",
		    "productURL": "http://www.amazon.in/dp/8184006098?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 149
		  },
		  {
		    "__v": 0,
		    "_id": "5427fabde29cc9e23d5ff1b6",
		    "currentPrice": 73870,
		    "productImage": "http://ecx.images-amazon.com/images/I/41w%2BRXo-PML._SX300_.jpg",
		    "productName": "Apple Thunderbolt Display 27",
		    "productURL": "http://www.amazon.in/dp/B00AVUNHNQ?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 73870
		  },
		  {
		    "__v": 0,
		    "_id": "54245b2a2770a7ef791e00a6",
		    "currentPrice": 601,
		    "productImage": "http://ecx.images-amazon.com/images/I/51eQvANUsnL._SY344_BO1,204,203,200_.jpg",
		    "productName": "The Book Thief (Readers Circle)",
		    "productURL": "http://www.amazon.in/dp/0375842209?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 601
		  },
		  {
		    "__v": 0,
		    "_id": "5421a80b8cf121893631185b",
		    "currentPrice": 2108,
		    "productImage": "http://ecx.images-amazon.com/images/I/31aMabAzEZL._SX300_.jpg",
		    "productName": "Wonderchef Ballarini Focus Frying Pan, 24cm",
		    "productURL": "http://www.amazon.in/dp/B002LV6VCC?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 2108
		  },
		  {
		    "__v": 0,
		    "_id": "5421a7b98cf1218936311859",
		    "currentPrice": 2023,
		    "productImage": "http://ecx.images-amazon.com/images/I/31LzHDVo6nL._SX300_.jpg",
		    "productName": "Wonderchef Ballarini Saturnia Frying Pan, 24cm",
		    "productURL": "http://www.amazon.in/dp/B005JWOB5Y?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 2023
		  },
		  {
		    "__v": 0,
		    "_id": "54218fe474d1d6d223a62ce9",
		    "currentPrice": 3795,
		    "productImage": "http://ecx.images-amazon.com/images/I/51-1MzIBP%2BL._SX395_.jpg",
		    "productName": "Woodland Men's Leather Boat Shoes",
		    "productURL": "http://www.amazon.in/dp/B00LPH5UFW?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 1896
		  },
		  {
		    "__v": 0,
		    "_id": "54201a8ee5c8b0b2083e508d",
		    "currentPrice": 1400,
		    "productImage": "http://ecx.images-amazon.com/images/I/41MglGdpIML._SY300_.jpg",
		    "productName": "Targus World Power Travel Adapter and USB Charger",
		    "productURL": "http://www.amazon.in/dp/B00H2H6B7K?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 736
		  },
		  {
		    "__v": 0,
		    "_id": "541fe246e5c8b0b2083e5089",
		    "currentPrice": 3700,
		    "productImage": "http://ecx.images-amazon.com/images/I/41EFmfIm6jL._SY300_.jpg",
		    "productName": "Apple iPod Shuffle 2GB - Gray",
		    "productURL": "http://www.amazon.in/dp/B00GMFYUMG?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 3135
		  },
		  {
		    "__v": 0,
		    "_id": "541bdd7a57493e3f4157ebad",
		    "currentPrice": 4300,
		    "productImage": "http://ecx.images-amazon.com/images/I/51D5DadRKtL._SY300_.jpg",
		    "productName": "SEASONIC S12II SERIES 430W POWER SUPPLY W/80+ CERTIFICATION",
		    "productURL": "http://www.amazon.in/dp/B0028RC9NE?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 4300
		  },
		  {
		    "__v": 0,
		    "_id": "541bb76257493e3f4157ebaa",
		    "alertFromPrice": 780,
		    "alertToPrice": 200,
		    "currentPrice": 200,
		    "productImage": "http://ecx.images-amazon.com/images/I/51ya2yJUuwL._SY300_.jpg",
		    "productName": "Gillette Mach3 Blades - 12 Cartridges",
		    "productURL": "http://www.amazon.in/dp/B00FMUFP9E?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 167
		  },
		  {
		    "__v": 0,
		    "_id": "541bb5d557493e3f4157eba7",
		    "currentPrice": 57790,
		    "productImage": "http://ecx.images-amazon.com/images/I/41TUTF8JUYL._SX300_.jpg",
		    "productName": "Canon EOS 700D 18MP Digital SLR Camera (Black) with 18-135mm STM Lens and 8GB Memory Card and Camera Bag",
		    "productURL": "http://www.amazon.in/dp/B00CGXMSW2?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 56700
		  },
		  {
		    "__v": 0,
		    "_id": "541ad6b2e37af6df3683a519",
		    "alertFromPrice": 18999,
		    "alertToPrice": 18634,
		    "currentPrice": 18634,
		    "productImage": "http://ecx.images-amazon.com/images/I/31Os7BIPguL._SL500_AA280_.jpg",
		    "productName": "Apple iPhone 4S (Black, 8GB)",
		    "productURL": "http://www.amazon.in/dp/B00GFGE5VS?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 15347
		  },
		  {
		    "__v": 0,
		    "_id": "54196bdbd59096bb618041e5",
		    "currentPrice": 4649,
		    "productImage": "http://ecx.images-amazon.com/images/I/21u2GblBccL._SX300_.jpg",
		    "productName": "Jabra Stealth Total Noise Blackout Bluetooth Headset Works with any bluetooth",
		    "productURL": "http://www.amazon.in/dp/B00N8QZ27E?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 4489
		  },
		  {
		    "__v": 0,
		    "_id": "54189ac4d59096bb618041df",
		    "currentPrice": 17000,
		    "productImage": "http://ecx.images-amazon.com/images/I/41Xi48ZVCmL._SL500_AA280_.jpg",
		    "productName": "Nokia Lumia 800",
		    "productURL": "http://www.amazon.in/dp/B0073OLZOG?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 17000
		  },
		  {
		    "__v": 0,
		    "_id": "54189a85d59096bb618041dc",
		    "currentPrice": 16425,
		    "productImage": "http://ecx.images-amazon.com/images/I/51PkGOIw3JL._SL500_AA280_.jpg",
		    "productName": "Nokia Lumia 1320 (Black)",
		    "productURL": "http://www.amazon.in/dp/B00GAPPY0A?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 14895
		  },
		  {
		    "__v": 0,
		    "_id": "54189a75d59096bb618041d9",
		    "currentPrice": 18999,
		    "productImage": "http://ecx.images-amazon.com/images/I/31Aisd3DN8L._SL500_AA280_.jpg",
		    "productName": "Nokia Lumia 1320 (Yellow)",
		    "productURL": "http://www.amazon.in/dp/B00GAPPSF6?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 16067
		  },
		  {
		    "__v": 0,
		    "_id": "54189765d59096bb618041d7",
		    "alertFromPrice": 37965,
		    "alertToPrice": 37245,
		    "currentPrice": 37880,
		    "productImage": "http://ecx.images-amazon.com/images/I/51f68Aiwo3L._SL500_AA280_.jpg",
		    "productName": "Apple iPhone 5s (Silver, 16GB)",
		    "productURL": "http://www.amazon.in/dp/B00FXLCG7G?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 29999
		  },
		  {
		    "__v": 0,
		    "_id": "54189732d59096bb618041cf",
		    "currentPrice": 23895,
		    "productImage": "http://ecx.images-amazon.com/images/I/41Jhw7TGpzL._SL500_AA280_.jpg",
		    "productName": "Apple iPhone 5c (Green, 8GB)",
		    "productURL": "http://www.amazon.in/dp/B00L8WSFBK?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 23499
		  },
		  {
		    "__v": 0,
		    "_id": "54189703d59096bb618041cc",
		    "alertFromPrice": 31425,
		    "alertToPrice": 29900,
		    "currentPrice": 31400,
		    "productImage": "http://ecx.images-amazon.com/images/I/41H9i9H3XPL._SY300_.jpg",
		    "productName": "Apple iPhone 5c (Yellow, 16GB)",
		    "productURL": "http://www.amazon.in/dp/B00FXLBMEO?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 28980
		  },
		  {
		    "__v": 0,
		    "_id": "541896f2d59096bb618041c9",
		    "currentPrice": 29666,
		    "productImage": "http://ecx.images-amazon.com/images/I/41B6GkauPQL._SL500_AA280_.jpg",
		    "productName": "Apple iPhone 5c (Yellow, 8GB)",
		    "productURL": "http://www.amazon.in/dp/B00L8WSSHQ?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 23499
		  },
		  {
		    "__v": 0,
		    "_id": "541896afd59096bb618041c6",
		    "currentPrice": 30600,
		    "productImage": "http://ecx.images-amazon.com/images/I/41wWXuJ6ubL._SL500_AA280_.jpg",
		    "productName": "Apple iPhone 5c with Jabra Talk Bluetooth Headset (White, 8GB)",
		    "productURL": "http://www.amazon.in/dp/B00KNOCAD8?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 24149
		  },
		  {
		    "__v": 0,
		    "_id": "5418969ad59096bb618041c3",
		    "currentPrice": 23021,
		    "productImage": "http://ecx.images-amazon.com/images/I/41Z3opVKJoL._SL500_AA280_.jpg",
		    "productName": "Apple iPhone 5c with Jabra Voice Easyvoice Bluetooth Headset (Yellow, 8GB)",
		    "productURL": "http://www.amazon.in/dp/B00KNOCSNK?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 23021
		  },
		  {
		    "__v": 0,
		    "_id": "54189687d59096bb618041c0",
		    "currentPrice": 24618,
		    "productImage": "http://ecx.images-amazon.com/images/I/31ShVRyykBL._SL500_AA280_.jpg",
		    "productName": "Apple iPhone 5c with Jabra Voice Easyvoice Bluetooth Headset (Blue, 8GB)",
		    "productURL": "http://www.amazon.in/dp/B00KNOCKC4?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 24618
		  },
		  {
		    "__v": 0,
		    "_id": "5417b928d59096bb618041bc",
		    "currentPrice": 9170,
		    "productImage": "http://ecx.images-amazon.com/images/I/51jeB65ptVL._SX300_.jpg",
		    "productName": "Nikon AF-S Nikkor 50mm F/1.8G Prime Lens",
		    "productURL": "http://www.amazon.in/dp/B00ALO11QW?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 9170
		  },
		  {
		    "__v": 0,
		    "_id": "54169abbd59096bb618041a8",
		    "currentPrice": 5299,
		    "productImage": "http://ecx.images-amazon.com/images/I/31Yx3uzdptL._SX300_.jpg",
		    "productName": "Jabra Rox In-ear Wireless Bluetooth Earphone",
		    "productURL": "http://www.amazon.in/dp/B00JQ6X4RK?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 5299
		  },
		  {
		    "__v": 0,
		    "_id": "5415a448d59096bb6180419e",
		    "currentPrice": 1990,
		    "productImage": "http://ecx.images-amazon.com/images/I/41b0WaqKWTL._SX300_.jpg",
		    "productName": "Jabra Tag Wireless Bluetooth Stereo Headset",
		    "productURL": "http://www.amazon.in/dp/B00K21KX40?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 1989
		  },
		  {
		    "__v": 0,
		    "_id": "54153bd9d59096bb61804199",
		    "currentPrice": 4228,
		    "productImage": "http://ecx.images-amazon.com/images/I/41kmOz-2aVL._SX300_.jpg",
		    "productName": "Microsoft Natural Ergonomic Keyboard 4000",
		    "productURL": "http://www.amazon.in/dp/B000A6PPOK?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 4074
		  },
		  {
		    "__v": 0,
		    "_id": "5414306fd59096bb61804197",
		    "alertFromPrice": 1074,
		    "alertToPrice": 293,
		    "currentPrice": 293,
		    "productImage": "http://ecx.images-amazon.com/images/I/51AWnjvl9vL._SX300_.jpg",
		    "productName": "Pampers Active Baby Large Size Diapers (78 count)",
		    "productURL": "http://www.amazon.in/dp/B00ESY069Y?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 246
		  },
		  {
		    "__v": 0,
		    "_id": "54143022d59096bb61804195",
		    "currentPrice": 1098,
		    "productImage": "http://ecx.images-amazon.com/images/I/51uEeQRE94L._SX395_.jpg",
		    "productName": "Carlton London Women's Ganice Fashion Sandals",
		    "productURL": "http://www.amazon.in/dp/B00INN4BM4?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 878
		  },
		  {
		    "__v": 0,
		    "_id": "54141f03d59096bb61804193",
		    "currentPrice": 1817,
		    "productImage": "http://ecx.images-amazon.com/images/I/31S-iBir52L._SY300_.jpg",
		    "productName": "Toni & Guy Cleanse Shampoo for Advanced Detox 250ml",
		    "productURL": "http://www.amazon.in/dp/B006L69Y18?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 1794
		  },
		  {
		    "__v": 0,
		    "_id": "54319c9712678c1757c63e14",
		    "currentPrice": 4950,
		    "productImage": "http://ecx.images-amazon.com/images/I/41UEL26S9rL._SX300_.jpg",
		    "productName": "Plantronics Voyager Edge Bluetooth Headset with Charge Case (White)",
		    "productURL": "http://www.amazon.in/dp/B00KAZUYV0?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 4940
		  },
		  {
		    "__v": 0,
		    "_id": "5413f8a8d59096bb61804186",
		    "currentPrice": 162,
		    "productImage": "http://ecx.images-amazon.com/images/I/61mvRRXlQpL._SY300_.jpg",
		    "productName": "Nestlé Cerelac Infant Cereal Stage-1 (6 Months-24 Months) Wheat Apple 300g",
		    "productURL": "http://www.amazon.in/dp/B00I4SYXIK?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 162
		  },
		  {
		    "__v": 0,
		    "_id": "5413ed63d59096bb61804184",
		    "currentPrice": 725,
		    "productImage": "http://ecx.images-amazon.com/images/I/41xT%2Bx1Ss8L._SX300_.jpg",
		    "productName": "L'Oreal Dermo Expertise Revitalift White Day Cream SPF 18",
		    "productURL": "http://www.amazon.in/dp/B00AV5RJOE?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 489
		  },
		  {
		    "__v": 0,
		    "_id": "5412db89a34d9755295db284",
		    "currentPrice": 9950,
		    "productImage": "http://ecx.images-amazon.com/images/I/411bYPHReSL._SX300_.jpg",
		    "productName": "Samsung WB350F 16.2MP CMOS Smart WiFi and NFC Digital Camera with 21x Optical Zoom and 3.0-inch Touchscreen LCD (White), 4GB Card, Camera Case with Free Samsung Backpack",
		    "productURL": "http://www.amazon.in/dp/B00HV6KK0G?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 9950
		  },
		  {
		    "__v": 0,
		    "_id": "540f0ae4a34d9755295db25f",
		    "currentPrice": 895,
		    "productImage": "http://ecx.images-amazon.com/images/I/11%2BX9SNEnFL.jpg",
		    "productName": "Bedsheet Set Single Plain 200 TC Cotton Satin - White",
		    "productURL": "http://www.amazon.in/dp/B00J87FT66?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 895
		  },
		  {
		    "__v": 0,
		    "_id": "540ac70c6ef7061d5198abe9",
		    "currentPrice": 515,
		    "productImage": "http://ecx.images-amazon.com/images/I/51RzogFPXWL._SY344_BO1,204,203,200_.jpg",
		    "productName": "The Hobbit (Part 1 and 2 Slipcase)",
		    "productURL": "http://www.amazon.in/dp/0007488513?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 239
		  },
		  {
		    "__v": 0,
		    "_id": "54074ee30bf557b5360c961e",
		    "currentPrice": 29999,
		    "productImage": "http://ecx.images-amazon.com/images/I/51L1fj1tBaL._SL500_AA280_.jpg",
		    "productName": "Samsung Galaxy K Zoom (Charcoal Black)",
		    "productURL": "http://www.amazon.in/dp/B00KV7YGKC?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 19999
		  },
		  {
		    "__v": 0,
		    "_id": "540469f12993161723641523",
		    "currentPrice": 10990,
		    "productImage": "http://ecx.images-amazon.com/images/I/419BuMKf08L._SX300_.jpg",
		    "productName": "Samsung WB250F 14MP CMOS Smart WiFi Digital Camera with 18x Optical Zoom and 3.0-inch HVGA Touchscreen (White), 4GB Card, Camera Case with Free Samsung Backpack",
		    "productURL": "http://www.amazon.in/dp/B00AXVYJGM?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 10990
		  },
		  {
		    "__v": 0,
		    "_id": "5401890436cc19dd7623cf23",
		    "alertFromPrice": 46000,
		    "alertToPrice": 38099,
		    "currentPrice": 46000,
		    "productImage": "http://ecx.images-amazon.com/images/I/41f-amQ1oWL._SX300_.jpg",
		    "productName": "Canon EOS 700D 18MP Digital SLR Camera (Black) with 18-55 STM Lens, 8GB SD Card, Camera Bag",
		    "productURL": "http://www.amazon.in/dp/B00ICEDTKY?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 38095
		  },
		  {
		    "__v": 0,
		    "_id": "53fb6b4641a7b54460f10d02",
		    "currentPrice": 21414,
		    "productImage": "http://ecx.images-amazon.com/images/I/41FV5XfqEvL._SX300_.jpg",
		    "productName": "Nikon AF-S DX Nikkor 55-300mm F/4.5-5.6G VR Telephoto Zoom Lens for Nikon DSLR Camera",
		    "productURL": "http://www.amazon.in/dp/B003ZSHNCC?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 20246
		  },
		  {
		    "__v": 0,
		    "_id": "53fb6b0841a7b54460f10cfe",
		    "alertFromPrice": 29990,
		    "alertToPrice": 29290,
		    "currentPrice": 30022,
		    "productImage": "http://ecx.images-amazon.com/images/I/41VbNIUApZL._SX300_.jpg",
		    "productName": "Nikon D5100 16.2MP Digital SLR Camera (Black) with AF-S 18-55mm VR Lens, 8GB Card, Camera Bag",
		    "productURL": "http://www.amazon.in/dp/B00JM4V3M4?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 22793
		  },
		  {
		    "__v": 0,
		    "_id": "53fb630841a7b54460f10cf9",
		    "currentPrice": 1959,
		    "productImage": "http://ecx.images-amazon.com/images/I/41UuWkTHMuL._SY300_.jpg",
		    "productName": "Targus Numeric Keypad (AKP10US)",
		    "productURL": "http://www.amazon.in/dp/B002NURRL0?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 1838
		  },
		  {
		    "__v": 0,
		    "_id": "53fb592b41a7b54460f10cf7",
		    "currentPrice": 3849,
		    "productImage": "http://ecx.images-amazon.com/images/I/41P7ICS6ocL._SX300_.jpg",
		    "productName": "Microsoft Natural Ergo 4000 Wired Keyboard (Black)",
		    "productURL": "http://www.amazon.in/dp/B00CEQFPEE?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 3579
		  },
		  {
		    "__v": 0,
		    "_id": "53fae669a4b18ae621d8f0d5",
		    "currentPrice": 8091,
		    "productImage": "http://ecx.images-amazon.com/images/I/41fW9vnn8qL._SY300_.jpg",
		    "productName": "Skagen Analog White Dial Women's Watch - SKW2149",
		    "productURL": "http://www.amazon.in/dp/B00FWXAJBA/ref=wl_it_dp_o_pC_nS_ttl?_encoding=UTF8&colid=Z3D55JC6OV67&coliid=IS35VZU9CEB15&tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 8091
		  },
		  {
		    "__v": 0,
		    "_id": "53fac35ca4b18ae621d8f0d3",
		    "currentPrice": 2081,
		    "productImage": "http://ecx.images-amazon.com/images/I/31Q4CcjJcUL._SX300_.jpg",
		    "productName": "Philips Kerashine HP8632/00 Essential Care Heated Styling Brush",
		    "productURL": "http://www.amazon.in/Philips-Kerashine-HP8632-00-Essential/dp/B00EYYOR0C/ref=sr_1_2?ie=UTF8&qid=1408942819&sr=8-2&keywords=philips+kerashine&tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 1962
		  },
		  {
		    "__v": 0,
		    "_id": "53fac316a4b18ae621d8f0d1",
		    "currentPrice": 1638,
		    "productImage": "http://ecx.images-amazon.com/images/I/41dmos5z6eL._SY300_.jpg",
		    "productName": "Philips Kerashine HP8216/00 Hair Dryer (Black)",
		    "productURL": "http://www.amazon.in/Philips-Kerashine-HP8216-00-Dryer/dp/B00E7O9506/ref=sr_1_3?ie=UTF8&qid=1408942819&sr=8-3&keywords=philips+kerashine&tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 1577
		  },
		  {
		    "__v": 0,
		    "_id": "53f9ce09a4b18ae621d8f0c6",
		    "currentPrice": 2295,
		    "productImage": "http://ecx.images-amazon.com/images/I/31BcY1WjI%2BL._SX300_.jpg",
		    "productName": "Philips HP8659 Essential Care Air Straightener (Black/Golden)",
		    "productURL": "http://www.amazon.in/Philips-HP8659-Essential-Straightener-Golden/dp/B00KT5MA68/ref=sr_1_fkmr0_1?ie=UTF8&qid=1408880083&sr=8-1-fkmr0&keywords=Philips+HP8659+Hair+Straightener&tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 1650
		  },
		  {
		    "__v": 0,
		    "_id": "53f8da54a4b18ae621d8f0be",
		    "currentPrice": 1111,
		    "productImage": "http://ecx.images-amazon.com/images/I/41SrOEWWPPL._SX300_.jpg",
		    "productName": "Hawkins Futura Non-Stick Frying Pan with Glass Lid, 26cm",
		    "productURL": "http://www.amazon.in/Hawkins-Futura-Non-Stick-Frying-Glass/dp/B00EVQYIQQ/ref=sr_1_21?s=kitchen&ie=UTF8&qid=1408817316&sr=1-21&keywords=non+stick+pan&tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 1111
		  },
		  {
		    "__v": 0,
		    "_id": "53f579f5edcebdb161ade5fa",
		    "alertFromPrice": 255,
		    "alertToPrice": 199,
		    "currentPrice": 255,
		    "productImage": "http://ecx.images-amazon.com/images/I/410yoZiECvL._SL500_AA240_.jpg",
		    "productName": "Four: A Divergent Collection [Paperback]",
		    "productURL": "http://www.amazon.in/Four-Divergent-Collection-Veronica-Roth/dp/0008100993/ref=pd_bxgy_b_text_y?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 159
		  },
		  {
		    "__v": 0,
		    "_id": "53f579b3edcebdb161ade5f8",
		    "alertFromPrice": 989,
		    "alertToPrice": 875,
		    "currentPrice": 875,
		    "productImage": "http://ecx.images-amazon.com/images/I/51WxxIqNx6L._SL500_AA240_.jpg",
		    "productName": "Divergent Series Boxed Set [Box set] [Paperback]",
		    "productURL": "http://www.amazon.in/Divergent-Boxed-Set-Veronica-Roth/dp/0007538049/ref=sr_1_2?s=books&ie=UTF8&qid=1408596212&sr=1-2&tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 242
		  },
		  {
		    "__v": 0,
		    "_id": "53f56ab8edcebdb161ade5f6",
		    "currentPrice": 675,
		    "productImage": "http://ecx.images-amazon.com/images/I/51cfHiudhTL._SL500_AA240_.jpg",
		    "productName": "Divergent (Book 1 and 2) [Box set] [Paperback]",
		    "productURL": "http://www.amazon.in/gp/product/0007524978/ref=s9_wish_co_d7_g14_i5?ie=UTF8&colid=1FKBVC8M10KLL&coliid=I2KYOVSD4PX5T2&pf_rd_m=A1VBAL9TL5WCBF&pf_rd_s=typ-top-left-1&pf_rd_r=150MA0ZXSM20N3J6HTS9&pf_rd_t=3201&pf_rd_p=518515887&pf_rd_i=typ01&tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 503
		  },
		  {
		    "__v": 0,
		    "_id": "53f489ce5cbdfbf854513e56",
		    "currentPrice": 14499,
		    "productImage": "http://ecx.images-amazon.com/images/I/416fRRf1mqL._SL500_AA280_.jpg",
		    "productName": "iBall Q1035 Tablet (WiFi, 3G, Voice Calling)",
		    "productURL": "http://www.amazon.in/iBall-Q1035-Tablet-Voice-Calling/dp/B00HF1AJ1C?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 13845
		  },
		  {
		    "__v": 0,
		    "_id": "53f21e8833cd493627f5abaa",
		    "currentPrice": 1599,
		    "productImage": "http://ecx.images-amazon.com/images/I/513AjC7amKL._SY300_.jpg",
		    "productName": "Aapno Rajasthan Wall Decor with Miniature Pots (Wood Brown)",
		    "productURL": "http://www.amazon.in/gp/product/B00F6O7TN6/ref=gb1h_img_c-7_2507_64018979?pf_rd_m=A1VBAL9TL5WCBF&pf_rd_t=101&pf_rd_s=center-7&pf_rd_r=1FVFFK2G91ASQE5WVHFC&pf_rd_i=1592905031&pf_rd_p=508912507&tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 1599
		  },
		  {
		    "__v": 0,
		    "_id": "53e725d2d3234aee6076fb1b",
		    "currentPrice": 4590,
		    "productImage": "http://ecx.images-amazon.com/images/I/51QR1rQqY5L._SY300_.jpg",
		    "productName": "Paris Hilton Analog Multicolor Dial Women's Watch - 13103JSG/06",
		    "productURL": "http://www.amazon.in/Paris-Hilton-Analog-Multicolor-Womens/dp/B00JSKW4Q6/ref=sr_1_2?m=A2T76I5XXSSDIF&s=watches&ie=UTF8&qid=1407656830&sr=1-2&tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 3825
		  },
		  {
		    "__v": 0,
		    "_id": "53e1cbede89ce8057bf1e936",
		    "currentPrice": 1080,
		    "productImage": "http://ecx.images-amazon.com/images/I/31yYx20i0YL.jpg",
		    "productName": "Anand Decor Mudda Sofa Rexine Bean Bag without Beans - Big Size, Black",
		    "productURL": "http://www.amazon.in/Anand-Decor-Mudda-Rexine-without/dp/B00JAY3Y50/ref=aag_m_pw_dp?ie=UTF8&m=ADV2LX5RF195&tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 585
		  },
		  {
		    "__v": 0,
		    "_id": "53d5101bd831273036964d5b",
		    "currentPrice": 2801,
		    "productImage": "http://ecx.images-amazon.com/images/I/41Uz3WZbOuL._SY300_.jpg",
		    "productName": "Zojirushi Stainless Steel Vacuum Insulated Lunch Jar, 1.27 Litres, Metallic Beige (SLGF-18-CU)",
		    "productURL": "http://www.amazon.in/Zojirushi-Stainless-Insulated-Metallic-SLGF-18-CU/dp/B001DDMJR0/ref=sr_1_12?s=kitchen&ie=UTF8&qid=1406472119&sr=1-12&tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 2801
		  },
		  {
		    "__v": 0,
		    "_id": "53d48be9d831273036964d58",
		    "alertFromPrice": 11200,
		    "alertToPrice": 9949,
		    "currentPrice": 9949,
		    "productImage": "http://ecx.images-amazon.com/images/I/31IxH3zCDSL._SL500_AA280_.jpg",
		    "productName": "Samsung Galaxy Tab 3 Neo SM-T111 (WiFi, 3G, Voice Calling), Cream White",
		    "productURL": "http://www.amazon.in/Samsung-Galaxy-SM-T111-Voice-Calling/dp/B00IJVUNYK/ref=pd_bxgy_e_img_y?tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 8325
		  },
		  {
		    "__v": 0,
		    "_id": "53d48bbcd831273036964d55",
		    "currentPrice": 10999,
		    "productImage": "http://ecx.images-amazon.com/images/I/31yPPmmcxyL._SL500_AA280_.jpg",
		    "productName": "Samsung Galaxy Tab 3 Neo SM-T111 (WiFi, 3G, Voice Calling), Black",
		    "productURL": "http://www.amazon.in/gp/product/B00IJVUKKW/ref=s9_pop_gw_g147_i3/277-1057282-1173006?pf_rd_m=A1VBAL9TL5WCBF&pf_rd_s=center-4&pf_rd_r=0Q503BWFSYX2YNHYNZAZ&pf_rd_t=101&pf_rd_p=402517747&pf_rd_i=1320006031&tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 8349
		  },
		  {
		    "__v": 0,
		    "_id": "53cfc65f4fa5f0755c00000b",
		    "currentPrice": 1599,
		    "productImage": "http://ecx.images-amazon.com/images/I/41EfnCn4leL._SY445_.jpg",
		    "productName": "Unnati Silks Women Handloom Kanchi Pure Cotton Multicolour Saree",
		    "productURL": "http://www.amazon.in/Unnati-Silks-Handloom-Kanchi-Multicolour/dp/B00K6788QK/ref=sr_1_2?s=apparel&ie=UTF8&qid=1406125083&sr=1-2&tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 1599
		  },
		  {
		    "__v": 0,
		    "_id": "53cea7d6ce871d104c000037",
		    "currentPrice": 999,
		    "productImage": "http://ecx.images-amazon.com/images/I/51B4sz7r9KL._SY300_.jpg",
		    "productName": "Amzer 96300 Krista Tempered Glass Screen Protector for iPhone 5C, iPhone 5S, iPhone 5",
		    "productURL": "http://www.amazon.in/Amzer-Krista-Tempered-Screen-Protector/dp/B00GMPB4OS/ref=sr_1_3?s=electronics&ie=UTF8&qid=1405990597&sr=1-3&keywords=iphone+5c+glass+protector&tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 499
		  },
		  {
		    "__v": 0,
		    "_id": "53ce821ece871d104c00001e",
		    "currentPrice": 4990,
		    "productImage": "http://ecx.images-amazon.com/images/I/31%2BLELi%2BpcL._SL500_AA280_.jpg",
		    "productName": "Swipe Slice Tablet (WiFi, Voice Calling), White",
		    "productURL": "http://www.amazon.in/gp/product/B00LVRP6BY/ref=amb_link_182317227_2/278-6423063-3596102?pf_rd_m=A1VBAL9TL5WCBF&pf_rd_s=center-B1&pf_rd_r=158KXMD8MRR63Q6RASVW&pf_rd_t=101&pf_rd_p=515018887&pf_rd_i=1320006031&tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 2999
		  },
		  {
		    "__v": 0,
		    "_id": "53c9c8518ca27ab40f000007",
		    "currentPrice": 399,
		    "productImage": "http://ecx.images-amazon.com/images/I/41j%2BGJugpaL._SY300_.jpg",
		    "productName": "Beautiful Ocean Blue Austrian Crystal Elegant Bracelet for Women",
		    "productURL": "http://www.amazon.in/Beautiful-Austrian-Crystal-Elegant-Bracelet/dp/B00HPQTSI2/ref=sr_1_3?s=jewelry&ie=UTF8&qid=1405695207&sr=1-3&tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 335
		  },
		  {
		    "__v": 0,
		    "_id": "53bb80e1aca18e447c00000d",
		    "currentPrice": 458,
		    "productImage": "http://ecx.images-amazon.com/images/I/51yiPs8%2BCLL._BO2,204,203,200_PIsitb-sticker-arrow-click,TopRight,35,-76_AA240_SH20_OU31_.jpg",
		    "productName": "Of Mice and Men: (Centennial Edition) [Paperback]",
		    "productURL": "http://www.amazon.in/gp/product/0142000671/ref=x_gr_w_bb?ie=UTF8&tag=goodreads_in-20&linkCode=as2&camp=1789&creative=9325&creativeASIN=0142000671&SubscriptionId=1MGPYB6YW3HWK55XCGG2&tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 458
		  },
		  {
		    "__v": 0,
		    "_id": "53ba5e344731ab846b000010",
		    "currentPrice": 1699,
		    "productImage": "http://ecx.images-amazon.com/images/I/41ALOG3btNL._SY300_.jpg",
		    "productName": "Nurturing Green S Shape Ficus 3 year old Bonsai Plant",
		    "productURL": "http://www.amazon.in/Nurturing-Green-Shape-Ficus-Bonsai/dp/B00K4X3TM4/ref=sr_1_2?ie=UTF8&qid=1404722642&sr=8-2&keywords=bonsai&tag=cheapass0a-21",
		    "eyes": 1,
		    "seller": "amazon",
		    "ltp": 1699
		  },
		  {
		    "__v": 0,
		    "_id": "5439e61b9b925cde753ee4ff",
		    "currentPrice": 15724,
		    "productImage": "http://n1.sdlcdn.com/imgs/a/h/1/ps3_12gb-5a423.jpg",
		    "productName": "Sony Playstation 3 (12GB) (Black)Sony",
		    "productURL": "http://www.snapdeal.com/product/sony-playstation-3-slim-12/608879#bcrumbSearch:|bcrumbLabelId:576?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 15724
		  },
		  {
		    "__v": 0,
		    "_id": "5439a8c39b925cde753ee4fc",
		    "currentPrice": 9825,
		    "productImage": "http://n2.sdlcdn.com/imgs/a/l/i/TP-Link-1300-450-Mbps-SDL526859179-1-25616.jpg",
		    "productName": "TP-Link 1300+450 Mbps AC1750 Wireless Dual Band Gigabit Router (Archer C7)TP-Link 1300+450 Mbps AC1750 Wireless Dual Band Gigabit Router (Archer C7)TP-Link",
		    "productURL": "http://www.snapdeal.com/product/tplink-1300450-mbps-ac1750-wireless/584545940?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 9825
		  },
		  {
		    "__v": 0,
		    "_id": "5439a8be9b925cde753ee4fa",
		    "alertFromPrice": 13880,
		    "alertToPrice": 12770,
		    "currentPrice": 13880,
		    "productImage": "http://n4.sdlcdn.com/imgs/a/j/x/LG-L90-White-SDL321777501-1-0c6e6.jpg",
		    "productName": "LG L90 WhiteLG L90 WhiteLG",
		    "productURL": "http://www.snapdeal.com/product/lg-l90-white/434392868?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 12770
		  },
		  {
		    "__v": 0,
		    "_id": "5439a8b99b925cde753ee4f8",
		    "currentPrice": 11545,
		    "productImage": "http://n4.sdlcdn.com/imgs/a/h/r/Sennheiser-RS-160-1329443-1-4553d.jpg",
		    "productName": "Sennheiser RS 160 Over Ear HeadphoneSennheiser RS 160 Over Ear HeadphoneSennheiser",
		    "productURL": "http://www.snapdeal.com/product/sennheiser-rs-160/239835?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 11545
		  },
		  {
		    "__v": 0,
		    "_id": "5439a8b49b925cde753ee4f6",
		    "currentPrice": 5972,
		    "productImage": "http://n3.sdlcdn.com/imgs/a/i/q/Sennheiser-HDR-160-1329476-1-1fb1a.jpg",
		    "productName": "Sennheiser HDR 160 Over Ear HeadphoneSennheiser HDR 160 Over Ear HeadphoneSennheiser",
		    "productURL": "http://www.snapdeal.com/product/sennheiser-hdr-160/239862?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 5972
		  },
		  {
		    "__v": 0,
		    "_id": "5439a8ac9b925cde753ee4f4",
		    "currentPrice": 1931,
		    "productImage": "http://n3.sdlcdn.com/imgs/a/i/s/Huawei-E-8231-USB-Wingle-SDL887701367-1-fc97a.jpg",
		    "productName": "Huawei E 8231 USB WingleHuawei E 8231 USB WingleHuawei",
		    "productURL": "http://www.snapdeal.com/product/huawei-e-8231-usb-wingle/815381640?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 1931
		  },
		  {
		    "__v": 0,
		    "_id": "5438dcf39e305cd861ebb593",
		    "currentPrice": 12983,
		    "productImage": "http://n1.sdlcdn.com/imgs/a/i/q/Canon-LBP7018C-Laser-Printer-SDL043393826-1-a5e37.jpg",
		    "productName": "Canon LBP7018C Laser PrinterCanon LBP7018C Laser PrinterCanon",
		    "productURL": "http://www.snapdeal.com/product/canon-lbp7018c-laser-printer/984593660?utm_source=earth_feed&utm_campaign=21_58&utm_medium=10311180&vendorCode=b7d6b2&aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 12983
		  },
		  {
		    "__v": 0,
		    "_id": "543866e19e305cd861ebb589",
		    "alertFromPrice": 73997,
		    "alertToPrice": 71693,
		    "currentPrice": 71690,
		    "productImage": "http://n1.sdlcdn.com/imgs/a/j/q/Apple-MD761HN-B-MacBook-Air-SDL924131495-1-d66b1.jpg",
		    "productName": "Apple MD761HN/B MacBook Air (4th Gen Intel Core i5- 4GB RAM- 256GB SSD- 13.3 Inches Screen- Mac OS X Mavericks- Intel HD Graphics 5000) (Silver)Apple MD761HN/B MacBook Air (4th Gen Intel Core i5- 4GB RAM- 256GB SSD- 13.3 Inches Screen- Mac OS X Mavericks- Intel HD Graphics 5000) (Silver)Apple",
		    "productURL": "http://www.snapdeal.com/product/apple-md761hnb-macbook-air-4th/1233297717#bcrumbSearch:|bcrumbLabelId:57?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 71690
		  },
		  {
		    "__v": 0,
		    "_id": "5437b60a9e305cd861ebb57d",
		    "currentPrice": 896,
		    "productImage": "http://n3.sdlcdn.com/imgs/a/i/p/Sennheiser-CX-180-Street-II-1159709-1-8483e.jpg",
		    "productName": "Sennheiser CX 180 Street II EarphonesSennheiser CX 180 Street II EarphonesSennheiser",
		    "productURL": "http://www.snapdeal.com/product/sennheiser-cx-180-street-ii/111857#bcrumbSearch:|bcrumbLabelId:288?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 779
		  },
		  {
		    "__v": 0,
		    "_id": "5437817a9e305cd861ebb56b",
		    "alertFromPrice": 25490,
		    "alertToPrice": 24999,
		    "currentPrice": 24999,
		    "productImage": "http://n2.sdlcdn.com/imgs/a/j/x/LG-Google-Nexus-5-16-SDL449311710-1-3c436.jpg",
		    "productName": "LG Google Nexus 5 16 GB (Black)LG Google Nexus 5 16 GB (Black)LG",
		    "productURL": "http://www.snapdeal.com/product/lg-google-nexus-5-16/848745269#bcrumbLabelId:175?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 24746
		  },
		  {
		    "__v": 0,
		    "_id": "5437686b9e305cd861ebb55f",
		    "alertFromPrice": 3143,
		    "alertToPrice": 2999,
		    "currentPrice": 2999,
		    "productImage": "http://n4.sdlcdn.com/imgs/a/j/j/Philips-Intelligent-Style-Range-AquaTouch-1357002-1-0b459.jpg",
		    "productName": "Philips Aqua Touch Shaver AT890Philips",
		    "productURL": "http://www.snapdeal.com/product/philips--intelligent-style-range/257911#bcrumbSearch:Philips%20aqua%20touch%20AT890?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 2999
		  },
		  {
		    "__v": 0,
		    "_id": "5436b80f9e305cd861ebb541",
		    "currentPrice": 22597,
		    "productImage": "http://n1.sdlcdn.com/imgs/a/j/x/HTC-Desire-816-Black--SDL769062205-1-f9a21.jpg",
		    "productName": "HTC Desire 816 (Grey)HTC Desire 816 (Grey)HTC",
		    "productURL": "http://www.snapdeal.com/product/htc-desire-816-black/414855762?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 21509
		  },
		  {
		    "__v": 0,
		    "_id": "5436521324977d4c11ca29d8",
		    "currentPrice": 3543,
		    "productImage": "http://n2.sdlcdn.com/imgs/a/n/k/SDL116218243_M_1_2x-db478.jpg",
		    "productName": "Bosch Home Tool GSB 500RE Universal use KitBosch",
		    "productURL": "http://www.snapdeal.com/product/bosch-home-tool-gsb-500re/2123392288#bcrumbSearch:bosch%20500%20re?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 3348
		  },
		  {
		    "__v": 0,
		    "_id": "5435366c24977d4c11ca29b5",
		    "currentPrice": 896,
		    "productImage": "http://n3.sdlcdn.com/imgs/a/i/p/Sennheiser-CX-180-Street-II-1159709-1-8483e.jpg",
		    "productName": "Sennheiser CX 180 Street II EarphonesSennheiser CX 180 Street II EarphonesSennheiser",
		    "productURL": "http://www.snapdeal.com/product/sennheiser-cx-180-street-ii/111857#bcrumbSearch:Sennheiser%20CX%20180%20Street%20II%20In-Ear%20Headphone?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 699
		  },
		  {
		    "__v": 0,
		    "_id": "5433c23b87adc5161cce89f3",
		    "currentPrice": 8108,
		    "productImage": "http://n2.sdlcdn.com/imgs/a/i/8/Nikon-AF-S-NIKKOR-50mm-SDL421099722-1-5e614.jpg",
		    "productName": "Nikon AF-S NIKKOR 50mm F/1.8G LensNikon AF-S NIKKOR 50mm F/1.8G LensNikon",
		    "productURL": "http://www.snapdeal.com/product/nikon-afs-nikkor-50mm-f18g/1170104386#bcrumbSearch:AF-S%20Nikkor%2050mm%20f/1.8G?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 7949
		  },
		  {
		    "__v": 0,
		    "_id": "54338cc487adc5161cce89e0",
		    "alertFromPrice": 39123,
		    "alertToPrice": 38499,
		    "currentPrice": 38499,
		    "productImage": "http://n4.sdlcdn.com/imgs/a/j/x/Apple-iPhone-5S-16-GB-SDL218153659-1-d5617.jpg",
		    "productName": "Apple iPhone 5S 16 GB (Gold)Apple",
		    "productURL": "http://www.snapdeal.com/product/apple-iphone-5s-16-gb/1302850866?&aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 36782
		  },
		  {
		    "__v": 0,
		    "_id": "54338b4b87adc5161cce89db",
		    "currentPrice": 32490,
		    "productImage": "http://n2.sdlcdn.com/imgs/a/i/q/Nikon-D5200-DSLR-with-AF-SDL731215216-2-46355.jpg",
		    "productName": "Nikon D5200 with 18-55mm LensNikon",
		    "productURL": "http://www.snapdeal.com/product/nikon-d5200-slr-with-afs/1180787#bcrumbSearch:|bcrumbLabelId:292?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 32490
		  },
		  {
		    "__v": 0,
		    "_id": "543387ce87adc5161cce89d4",
		    "currentPrice": 32490,
		    "productImage": "http://n2.sdlcdn.com/imgs/a/i/q/Nikon-D5200-DSLR-with-AF-SDL731215216-2-46355.jpg",
		    "productName": "Nikon D5200 with 18-55mm LensNikon",
		    "productURL": "http://www.snapdeal.com/product/nikon-d5200-slr-with-afs/1180787?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 32490
		  },
		  {
		    "__v": 0,
		    "_id": "54335e2187adc5161cce89cf",
		    "currentPrice": 8276,
		    "productImage": "http://n3.sdlcdn.com/imgs/a/j/0/Fossil-JR1355-Men-s-Watches-SDL528710691-1-0c7c7.jpg",
		    "productName": "Fossil  JR1355  Men's WatchesFossil",
		    "productURL": "http://www.snapdeal.com/product/fossil-jr1355-mens-watches/116536177?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 7689
		  },
		  {
		    "__v": 0,
		    "_id": "543317df87adc5161cce89c6",
		    "currentPrice": 130997,
		    "productImage": "http://n1.sdlcdn.com/imgs/a/m/k/Apple-MGXA2HN-A-MacBook-Pro-SDL150486172-1-724c2.jpg",
		    "productName": "Apple (MGXA2HN/A) MacBook Pro Notebook (4th Gen Intel Core i7- 16GB RAM- 256GB SSD- 15.4 Inches- Mac OS X Mavericks) (Silver)Apple",
		    "productURL": "http://www.snapdeal.com/product/apple-mgxa2hna-macbook-pro-notebook/1356690537?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 130997
		  },
		  {
		    "__v": 0,
		    "_id": "543317b487adc5161cce89c2",
		    "currentPrice": 161563,
		    "productImage": "http://n3.sdlcdn.com/imgs/a/m/k/Apple-MGXC2HN-A-MacBook-Pro-SDL150901645-1-c6aed.jpg",
		    "productName": "Apple (MGXC2HN/A) MacBook Pro Notebook (4th Gen Intel Core i7- 16GB RAM- 512GB SSD- Mac OS X Mavericks- 2GB Graph) (Silver)Apple",
		    "productURL": "http://www.snapdeal.com/product/apple-mgxc2hna-macbook-pro-notebook/2062459884?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 150774
		  },
		  {
		    "__v": 0,
		    "_id": "5432c60612678c1757c63e9d",
		    "currentPrice": 699,
		    "productImage": "http://n1.sdlcdn.com/imgs/a/i/s/Reebok-Coalition-II-Smart-Black-SDL620978255-1-f62c4.JPG",
		    "productName": "Reebok Coalition II Smart Black And Yellow FloatersReebok",
		    "productURL": "http://www.snapdeal.com/product/reebok-coalition-ii-smart-black/737338623#bcrumbLabelId:393?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 699
		  },
		  {
		    "__v": 0,
		    "_id": "5432a48d12678c1757c63e88",
		    "alertFromPrice": 39214,
		    "alertToPrice": 38499,
		    "currentPrice": 38499,
		    "productImage": "http://n4.sdlcdn.com/imgs/a/j/x/Apple-iPhone-5S-16-GB-SDL218153659-1-d5617.jpg",
		    "productName": "Apple iPhone 5S 16 GB (Gold)Apple",
		    "productURL": "http://www.snapdeal.com/product/apple-iphone-5s-16-gb/1302850866#bcrumbSearch:iphone%205s%20gold?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 34499
		  },
		  {
		    "__v": 0,
		    "_id": "543295ba12678c1757c63e85",
		    "currentPrice": 16999,
		    "productImage": "http://n4.sdlcdn.com/imgs/a/j/x/Apple-iPad-Mini-With-Wi-SDL526791938-1-a15ff.jpg",
		    "productName": "Apple iPad Mini With Wi-Fi 16GB Space GreyApple",
		    "productURL": "http://www.snapdeal.com/product/apple-ipad-mini-with-wifi/731818190#bcrumbSearch:|bcrumbLabelId:133?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 16021
		  },
		  {
		    "__v": 0,
		    "_id": "5432262412678c1757c63e41",
		    "alertFromPrice": 39214,
		    "alertToPrice": 38499,
		    "currentPrice": 38499,
		    "productImage": "http://n4.sdlcdn.com/imgs/a/j/x/Apple-iPhone-5S-16-GB-SDL218153659-1-d5617.jpg",
		    "productName": "Apple iPhone 5S 16 GB (Gold)Apple",
		    "productURL": "http://www.snapdeal.com/product/apple-iphone-5s-16-gb/1302850866#bcrumbSearch:apple%20iphone%205s?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 34499
		  },
		  {
		    "__v": 0,
		    "_id": "542fa8a63e8fe3a71216dece",
		    "currentPrice": 899,
		    "productImage": "http://n4.sdlcdn.com/imgs/a/l/4/Bonita-White-Small-Wall-Cloth-SDL722621952-1-c4afe.jpg",
		    "productName": "Bonita Wonder Wall Cloth Dryer (buy 1 Get 1)BONITA",
		    "productURL": "http://www.snapdeal.com/product/bonita-white-small-wall-cloth/63523555?utm_source=DailyNewsletter&utm_medium=29624&utm_campaign=BOGO_041014&utm_term=Home2&utm_content=SP&email=mahulkar@gmail.com&aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 899
		  },
		  {
		    "__v": 0,
		    "_id": "542d2ddaafccee9d69f58e1e",
		    "currentPrice": 36890,
		    "productImage": "http://n1.sdlcdn.com/imgs/a/m/c/Samsung-Galaxy-Tab-S-8-SDL128107485-1-22d69.jpg",
		    "productName": "Samsung Galaxy Tab S 8.4 Tablet 16GB Wi-fi+3G Titanium BronzeSamsung",
		    "productURL": "http://www.snapdeal.com/product/samsung-galaxy-tab-s-84/1068986818#bcrumbLabelId:133?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 36702
		  },
		  {
		    "__v": 0,
		    "_id": "542d1ae3afccee9d69f58e1c",
		    "currentPrice": 510,
		    "productImage": "http://n1.sdlcdn.com/imgs/a/l/v/Vincent-Chase-93878-Unisex-Aviator-SDL487586271-1-83d02.jpg",
		    "productName": "Vincent Chase 93878 Unisex Aviator SunglassesVincent Chase",
		    "productURL": "http://www.snapdeal.com/product/vincent-chase-93878-medium-unisex/1875789316?utm_source=earth_feed&utm_campaign=473_15&utm_medium=100477115#prdsc&aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 425
		  },
		  {
		    "__v": 0,
		    "_id": "542d19f3afccee9d69f58e1a",
		    "currentPrice": 510,
		    "productImage": "http://n2.sdlcdn.com/imgs/a/l/v/Vincent-Chase-93666-Unisex-Aviator-SDL270023832-1-ac860.jpg",
		    "productName": "Vincent Chase 93666 Unisex Aviator SunglassesVincent Chase",
		    "productURL": "http://www.snapdeal.com/product/vincent-chase-93666-medium-unisex/1371582686?utm_source=earth_feed&utm_campaign=473_15&utm_medium=100477115&vendorCode=c798c2#prdsc&aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 280
		  },
		  {
		    "__v": 0,
		    "_id": "54218e7174d1d6d223a62ce5",
		    "currentPrice": 3605,
		    "productImage": "http://n3.sdlcdn.com/imgs/a/h/x/Woodland-Sturdy-Brown-Casual-Shoes-SDL106829358-1-660b7.jpg",
		    "productName": "Woodland Sturdy Brown Casual ShoesWoodland",
		    "productURL": "http://www.snapdeal.com/product/woodland-sturdy-brown-casual-shoes/970439329?attrVal=8&aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 2659
		  },
		  {
		    "__v": 0,
		    "_id": "54214a9274d1d6d223a62ce1",
		    "currentPrice": 37900,
		    "productImage": "http://n2.sdlcdn.com/imgs/a/m/c/Samsung-Galaxy-Tab-S-8-SDL126662818-1-e2016.jpg",
		    "productName": "Samsung Galaxy Tab S 8.4 Tablet 16GB Wi-fi+3G Dazzling WhiteSamsung",
		    "productURL": "http://www.snapdeal.com/product/samsung-galaxy-tab-s-84/1221918805#ReviewHeader?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 36212
		  },
		  {
		    "__v": 0,
		    "_id": "541fe238e5c8b0b2083e5087",
		    "alertFromPrice": 3399,
		    "alertToPrice": 600,
		    "currentPrice": 600,
		    "productImage": "http://n1.sdlcdn.com/imgs/a/i/g/Apple-iPod-shuffle-2GB-Silver-1537189-1-642f3.jpg",
		    "productName": "Apple iPod shuffle 2GB - SilverApple",
		    "productURL": "http://www.snapdeal.com/product/apple-ipod-shuffle-2gb-silver/427270#bcrumbSearch:ipod%20shuffle?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 600
		  },
		  {
		    "__v": 0,
		    "_id": "541f33bd173afe5a7e422b8f",
		    "currentPrice": 30820,
		    "productImage": "http://n2.sdlcdn.com/imgs/a/i/6/Sony-SLT-A58K-SLR-with-SDL516078003-1-c2ac8.jpg",
		    "productName": "Sony Alpha SLT A58K with 18-55mm LensSony",
		    "productURL": "http://www.snapdeal.com/product/sony-slta58k-slr-with-sal/1423959#bcrumbSearch:alpha%20a58?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 29516
		  },
		  {
		    "__v": 0,
		    "_id": "541e8506326e7002730735ca",
		    "alertFromPrice": 24231,
		    "alertToPrice": 23272,
		    "currentPrice": 24203,
		    "productImage": "http://n2.sdlcdn.com/imgs/a/l/b/LG-32LB563B-32-Inches-HD-SDL694400992-1-59bf2.jpg",
		    "productName": "LG 32LB563B 32 Inches HD Ready LED TelevisionLG",
		    "productURL": "http://www.snapdeal.com/product/lg-32lb563b-32-inches-hd/900707070?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 21990
		  },
		  {
		    "__v": 0,
		    "_id": "5418592ad59096bb618041be",
		    "currentPrice": 3195,
		    "productImage": "http://n1.sdlcdn.com/imgs/a/i/6/Red-Chief-Brown-Casual-Shoes-SDL619342271-1-c25f8.JPG",
		    "productName": "Red Chief Brown  Casual ShoesRed Chief",
		    "productURL": "http://www.snapdeal.com/product/red-chief-brown-casual-shoes/763977114#bcrumbSearch:|bcrumbLabelId:254?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 2237
		  },
		  {
		    "__v": 0,
		    "_id": "5417b90ad59096bb618041ba",
		    "currentPrice": 8108,
		    "productImage": "http://n2.sdlcdn.com/imgs/a/i/8/Nikon-AF-S-NIKKOR-50mm-SDL421099722-1-5e614.jpg",
		    "productName": "Nikon AF-S NIKKOR 50mm F/1.8G LensNikon",
		    "productURL": "http://www.snapdeal.com/product/nikon-afs-nikkor-50mm-f18g/1170104386#bcrumbSearch:50mm%201.8g?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 7802
		  },
		  {
		    "__v": 0,
		    "_id": "54170aced59096bb618041af",
		    "currentPrice": 2690,
		    "productImage": "http://n2.sdlcdn.com/imgs/a/h/q/Red-Chief-Striking-Brown-Casual-SDL056798933-1-ec5b6.JPG",
		    "productName": "Red Chief Striking Brown Casual ShoesRed Chief",
		    "productURL": "http://www.snapdeal.com/product/red-chief-striking-brown-casual/612633717?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 1992
		  },
		  {
		    "__v": 0,
		    "_id": "54170aa5d59096bb618041ad",
		    "currentPrice": 2502,
		    "productImage": "http://n3.sdlcdn.com/imgs/a/h/q/Red-Chief-Beige-Casual-Shoes-SDL059960120-1-eb745.JPG",
		    "productName": "Red Chief Beige Casual ShoesRed Chief",
		    "productURL": "http://www.snapdeal.com/product/red-chief-beige-casual-shoes/1334786494?utm_source=earth_dyremtext&utm_campaign=web_cart&utm_medium=16937511&aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 2097
		  },
		  {
		    "__v": 0,
		    "_id": "5414015bd59096bb61804190",
		    "currentPrice": 2690,
		    "productImage": "http://n2.sdlcdn.com/imgs/a/h/q/Red-Chief-Striking-Brown-Casual-SDL056798933-1-ec5b6.JPG",
		    "productName": "Red Chief Striking Brown Casual ShoesRed Chief",
		    "productURL": "http://www.snapdeal.com/product/red-chief-striking-brown-casual/612633717?utm_source=earth_dyrem&utm_campaign=7-dyrem&aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 1992
		  },
		  {
		    "__v": 0,
		    "_id": "5413fe41d59096bb6180418e",
		    "alertFromPrice": 64493,
		    "alertToPrice": 61991,
		    "currentPrice": 62890,
		    "productImage": "http://n2.sdlcdn.com/imgs/a/j/q/Apple-MD760HN-B-MacBook-Air-SDL924120872-1-edabf.jpg",
		    "productName": "Apple MD760HN/B MacBook Air (4th Gen Intel Core i5- 4GB RAM- 128GB SSD- 13.3 Inches Screen- Mac OS X Mavericks- Intel HD Graphics 5000) (Silver)Apple",
		    "productURL": "http://www.snapdeal.com/product/apple-md760hnb-macbook-air-4th/837388655?utm_source=aff_prog&utm_campaign=afts&offer_id=17&aff_id=13521&aff_sub=electronics&aff_sub2=14105955290176&aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 56690
		  },
		  {
		    "__v": 0,
		    "_id": "54130ea0a34d9755295db286",
		    "currentPrice": 2795,
		    "productImage": "http://n2.sdlcdn.com/imgs/a/j/0/Casio-Edifice-Men-s-Watch-SDL891650344-1-23a2d.jpg",
		    "productName": "Casio Edifice Men's Watch EF 550DCasio",
		    "productURL": "http://www.snapdeal.com/product/casio-edifice-mens-watch-ef/78207504?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 2795
		  },
		  {
		    "__v": 0,
		    "_id": "540f26d8a34d9755295db266",
		    "currentPrice": 2965,
		    "productImage": "http://n1.sdlcdn.com/imgs/a/i/6/Red-Chief-Brown-Casual-Shoes-SDL621568887-1-012a8.JPG",
		    "productName": "Red Chief Brown  Casual ShoesRed Chief",
		    "productURL": "http://www.snapdeal.com/product/red-chief-brown-casual-shoes/580021499?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 2307
		  },
		  {
		    "__v": 0,
		    "_id": "540f269aa34d9755295db264",
		    "currentPrice": 3195,
		    "productImage": "http://n2.sdlcdn.com/imgs/a/i/6/Red-Chief-Brown-Casual-Shoes-SDL620876487-1-60dbf.JPG",
		    "productName": "Red Chief Brown  Casual ShoesRed Chief",
		    "productURL": "http://www.snapdeal.com/product/red-chief-brown-casual-shoes/1693608994#bcrumbSearch:Red%20Chief%20Strong%20Brown%20Casual%20Shoes?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 2237
		  },
		  {
		    "__v": 0,
		    "_id": "540f2591a34d9755295db262",
		    "currentPrice": 699,
		    "productImage": "http://n1.sdlcdn.com/imgs/a/i/q/Milton-Thermosteel-1000-ML-Flask-SDL027489032-1-6cd6e.jpg",
		    "productName": "Milton Thermosteel - 1000 ML FlaskMilton",
		    "productURL": "http://www.snapdeal.com/product/milton-thermosteel-1000-ml-flask/1383039?&aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 440
		  },
		  {
		    "__v": 0,
		    "_id": "540750f20bf557b5360c9621",
		    "currentPrice": 29990,
		    "productImage": "http://n1.sdlcdn.com/imgs/a/j/u/Sony-Xperia-Z1-Compact-White-SDL575090104-1-c6665.jpg",
		    "productName": "Sony Xperia Z1 Compact WhiteSony",
		    "productURL": "http://www.snapdeal.com/product/sony-xperia-z1-compact-white/734150330#bcrumbLabelId:175?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 28837
		  },
		  {
		    "__v": 0,
		    "_id": "53fac30ca4b18ae621d8f0cf",
		    "currentPrice": 1685,
		    "productImage": "http://n3.sdlcdn.com/imgs/a/i/p/Philips-Hair-Dryer-Kerashine-SDL584675959-1-19d2b.jpg",
		    "productName": "Philips Hair Dryer Kerashine HD8216Philips",
		    "productURL": "http://www.snapdeal.com/product/philips-kerashine-hair-dryer/1492898#bcrumbSearch:philips%20kerashine?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 1685
		  },
		  {
		    "__v": 0,
		    "_id": "53da13ee8364ebbe2550bd93",
		    "currentPrice": 1659,
		    "productImage": "http://n4.sdlcdn.com/imgs/a/a/z/GV_600020_L_M_1_2X_new-ae040.JPG",
		    "productName": "Vega Helmet - Off Road (Dull Black)Vega Auto",
		    "productURL": "http://www.snapdeal.com/product/vega-helmet-off-road-dull/258041?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 1600
		  },
		  {
		    "__v": 0,
		    "_id": "53ce9426ce871d104c00002b",
		    "currentPrice": 17376,
		    "productImage": "http://n4.sdlcdn.com/imgs/a/j/0/Samsung-Galaxy-Grand-2-Black-SDL175350551-1-64a6b.jpg",
		    "productName": "Samsung Galaxy Grand 2 BlackSamsung",
		    "productURL": "http://www.snapdeal.com/product/samsung-galaxy-grand-2-black/116878426?aff_id=12129&utm_source=aff_prog&utm_campaign=afts&offer_id=17",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 16499
		  },
		  {
		    "__v": 0,
		    "_id": "53c7ef9e389c97fe6700000c",
		    "currentPrice": 17700,
		    "productImage": "http://n1.sdlcdn.com/imgs/a/i/q/Samsung-HW-F450-F-Series-SDL862934843-1-06551.jpg",
		    "productName": "Samsung-HW-F450 Soundbar",
		    "productURL": "http://snapdeal.com/product/samsunghwf450-f-series-soundbar/1370632",
		    "eyes": 1,
		    "seller": "snapdeal",
		    "ltp": 17081
		  },
		  {
		    "__v": 0,
		    "_id": "543961cd9e305cd861ebb5a1",
		    "currentPrice": 1550,
		    "productImage": "http://static11.jassets.com/p/Baggit-Pink-Leather-Sling-Bag-1359-518018-1-product2.jpg",
		    "productName": "Pink Leather Sling Bag",
		    "productURL": "http://www.jabong.com/baggit-Pink-Leather-Sling-Bag-810815.html",
		    "eyes": 1,
		    "seller": "jabong",
		    "ltp": 1550
		  },
		  {
		    "__v": 0,
		    "_id": "5437b1299e305cd861ebb578",
		    "currentPrice": 999,
		    "productImage": "http://static14.jassets.com/p/Biba-Orange-Cotton-Straight-Kurta-5368-514917-1-product2.jpg",
		    "productName": "Orange Cotton Straight Kurta",
		    "productURL": "http://www.jabong.com/Biba-Orange-Cotton-Straight-Kurta-719415.html?pos=20",
		    "eyes": 1,
		    "seller": "jabong",
		    "ltp": 999
		  },
		  {
		    "__v": 0,
		    "_id": "5437b0cf9e305cd861ebb576",
		    "currentPrice": 1599,
		    "productImage": "http://static14.jassets.com/p/Melange-Solid-Off-White-Kurta-8406-207437-1-product2.jpg",
		    "productName": "Solid Off White Kurta",
		    "productURL": "http://www.jabong.com/melange-Solid-Off-White-Kurta-734702.html?utm_source=email_promo&utm_medium=live&utm_campaign=[CRM]20141011_Live_Surf_1",
		    "eyes": 1,
		    "seller": "jabong",
		    "ltp": 1599
		  },
		  {
		    "__v": 0,
		    "_id": "543665d924977d4c11ca29e6",
		    "currentPrice": 1499,
		    "productImage": "http://static14.jassets.com/p/Global-Desi-Viscose-Orange-Kurta-5941-683877-1-product2.jpg",
		    "productName": "Viscose Orange Kurta",
		    "productURL": "http://www.jabong.com/Global_Desi-Viscose-Orange-Kurta-778386.html",
		    "eyes": 1,
		    "seller": "jabong",
		    "ltp": 1499
		  },
		  {
		    "__v": 0,
		    "_id": "543664ec24977d4c11ca29e4",
		    "currentPrice": 3295,
		    "productImage": "http://static13.jassets.com/p/Nike-Air-Profusion-Ii-Grey-Running-Shoes-2093-751776-1-product2.jpg",
		    "productName": "Air Profusion Ii Grey Running Shoes",
		    "productURL": "http://www.jabong.com/Nike-Air-Profusion-Ii-Grey-Running-Shoes-677157.html",
		    "eyes": 1,
		    "seller": "jabong",
		    "ltp": 3295
		  },
		  {
		    "__v": 0,
		    "_id": "5436634124977d4c11ca29e2",
		    "currentPrice": 3295,
		    "productImage": "http://static14.jassets.com/p/Nike-Air-Profusion-Ii-Blue-Running-Shoes-5404-749305-1-product2.jpg",
		    "productName": "Air Profusion Ii Blue Running Shoes",
		    "productURL": "http://www.jabong.com/Nike-Air-Profusion-Ii-Blue-Running-Shoes-503947.html",
		    "eyes": 1,
		    "seller": "jabong",
		    "ltp": 3295
		  },
		  {
		    "__v": 0,
		    "_id": "5433e96f87adc5161cce8a06",
		    "currentPrice": 2799,
		    "productImage": "http://static14.jassets.com/p/United-Colors-of-Benetton-Blue-Stretch-Slim-Fit-Jeans-2304-566057-1-product2.jpg",
		    "productName": "Blue Stretch Slim Fit Jeans",
		    "productURL": "http://www.jabong.com/United-Colors-of-Benetton-Blue-Stretch-Slim-Fit-Jeans-750665.html?pos=3",
		    "eyes": 1,
		    "seller": "jabong",
		    "ltp": 2799
		  },
		  {
		    "__v": 0,
		    "_id": "53e271562cc88e197d67f532",
		    "alertFromPrice": 2695,
		    "alertToPrice": 1887,
		    "currentPrice": 1887,
		    "productImage": "http://static14.jassets.com/p/Vero-Moda-Grey--Printed-Jeans-7775-751085-1-product2.jpg",
		    "productName": "Grey  Printed Jeans",
		    "productURL": "http://www.jabong.com/vero-moda-Grey-Printed-Jeans-580157.html",
		    "eyes": 1,
		    "seller": "jabong",
		    "ltp": 1348
		  },
		  {
		    "__v": 0,
		    "_id": "53e219882cc88e197d67f52f",
		    "currentPrice": 400,
		    "productImage": "http://static11.jassets.com/p/Fame-Forever-Purple-Full-Sleeve-Top-1468-959946-1-product2.jpg",
		    "productName": "Purple Full Sleeve Top",
		    "productURL": "http://www.jabong.com/fame-forever-Purple-Full-Sleeve-Top-649959.html",
		    "eyes": 1,
		    "seller": "jabong",
		    "ltp": 400
		  },
		  {
		    "__v": 0,
		    "_id": "53d89e0007cde99906e432af",
		    "alertFromPrice": 1995,
		    "alertToPrice": 1397,
		    "currentPrice": 1397,
		    "productImage": "http://static14.jassets.com/p/Crocs-Kadee-Red-Belly-Shoes-5757-298285-1-product2.jpg",
		    "productName": "Kadee Red Belly Shoes",
		    "productURL": "http://www.jabong.com/Crocs-Kadee-Red-Belly-Shoes-582892.html",
		    "eyes": 1,
		    "seller": "jabong",
		    "ltp": 1397
		  },
		  {
		    "__v": 0,
		    "_id": "53ce5a6936000efe48000005",
		    "currentPrice": 1200,
		    "productImage": "http://static14.jassets.com/p/Adidas-Alcor-M-Black-Running-Shoes-2156-582981-1-product2.jpg",
		    "productName": "Alcor M Black Running Shoes",
		    "productURL": "http://www.jabong.com/Adidas-Alcor-M-Black-Running-Shoes-189285.html?pos=1",
		    "eyes": 1,
		    "seller": "jabong",
		    "ltp": 1200
		  },
		  {
		    "__v": 0,
		    "_id": "53bf97245649660a2300001d",
		    "currentPrice": 95800,
		    "productImage": "http://www.bajaao.com/media/extendware/ewminify/media/inline/af/5/Based_upon_Numar_4fc8b76d42a7c_4.jpg",
		    "productName": "Numark Mixdeck Quad DJ System + 4-channel Mixer, 2 Platters, and Support for Apple iPad",
		    "productURL": "http://www.bajaao.com/dj-gear/dj-packages/numark-mixdeck-quaddj-system-4-channel-mixer-2-platters-and-support-for-apple-ipad.html",
		    "eyes": 1,
		    "seller": "bajaao",
		    "ltp": 95800
		  },
		  {
		    "__v": 0,
		    "_id": "5437bfd89e305cd861ebb57f",
		    "currentPrice": 890,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/Fabindia-Women-Kurtis_8d7761da4598a3c03d9b744a44354b4b_images.jpg",
		    "productName": "Fabindia Women Maroon Hand Embroidered Kurti",
		    "productURL": "http://www.myntra.com/kurtis/fabindia/fabindia-women-maroon-hand-embroidered-kurti/415393/buy?src=search&uq=&q=fabindia&p=5",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 890
		  },
		  {
		    "__v": 0,
		    "_id": "5436683424977d4c11ca29e8",
		    "currentPrice": 1599,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/Melange-by-Lifestyle-Women-Off-White---Teal-Green-Printed-Kurta_238b90fca5ccc13974738f5eac372846_images.jpg",
		    "productName": "Melange by Lifestyle Women Off-White & Teal Green Printed Kurta",
		    "productURL": "http://www.myntra.com/kurtas/melange-by-lifestyle/melange-by-lifestyle-women-off-white--teal-green-printed-kurta/397519/buy?src=search&uq=true&q=melange&p=60",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 1599
		  },
		  {
		    "__v": 0,
		    "_id": "543430b3e4bbf13d5efba8ac",
		    "currentPrice": 1699,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/Pepe-Jeans-Women-Blue-Floral-Print-Shirt_b86987629751da72fb07d85a632c7bef_images.jpg",
		    "productName": "Pepe Jeans Women Blue Floral Print Shirt",
		    "productURL": "http://www.myntra.com/shirts/pepe-jeans/pepe-jeans-women-blue-floral-print-shirt/409015/buy?src=search&uq=&q=women-shirts&p=6",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 1699
		  },
		  {
		    "__v": 0,
		    "_id": "5433de7487adc5161cce8a03",
		    "currentPrice": 1699,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/FILA-Men-Sports-Sandals_548a6c63065aaa69bb305175435ffc5b_images.jpg",
		    "productName": "FILA Men Black Roadstar Sports Sandals",
		    "productURL": "http://www.myntra.com/sports-sandals/fila/fila-men-black-roadstar-sports-sandals/417786/buy?src=search&uq=&q=men-sandals&p=39",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 1699
		  },
		  {
		    "__v": 0,
		    "_id": "543306a387adc5161cce89b9",
		    "currentPrice": 348,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/Ayesha-Neon-Green-Beaded-Bracelet_d817b8789da3fded6c3457d10faad34f_images.jpg",
		    "productName": "Ayesha Neon Green Beaded Bracelet",
		    "productURL": "http://www.myntra.com/Bracelet/Ayesha/Ayesha-Neon-Green-Beaded-Bracelet/191197/buy",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 348
		  },
		  {
		    "__v": 0,
		    "_id": "5433069287adc5161cce89b7",
		    "currentPrice": 349,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/ToniQ-Gold-Toned-Finger-Bracelet_7d52e9d54e50d872e145114b644c4041_images.jpg",
		    "productName": "ToniQ Gold-Toned Finger Bracelet",
		    "productURL": "http://www.myntra.com/Bracelet/ToniQ/ToniQ-Gold-Toned-Finger-Bracelet/429576/buy",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 349
		  },
		  {
		    "__v": 0,
		    "_id": "5433068187adc5161cce89b5",
		    "currentPrice": 449,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/Flaunt-Women-Necklace_b780050f48ee2b41b97abf499e83dceb_images.jpg",
		    "productName": "Flaunt Silver-Toned Necklace",
		    "productURL": "http://www.myntra.com/Necklace/Flaunt/Flaunt-Silver-Toned-Necklace/387577/buy",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 449
		  },
		  {
		    "__v": 0,
		    "_id": "5433066787adc5161cce89b3",
		    "currentPrice": 356,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/DressBerry-Silver-Toned-Bracelet_de143bbf1d08f27be937df95b87d4436_images.jpg",
		    "productName": "DressBerry Silver Toned Cuff Bracelet",
		    "productURL": "http://www.myntra.com/Bracelet/DressBerry/DressBerry-Silver-Toned-Cuff-Bracelet/277742/buy",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 356
		  },
		  {
		    "__v": 0,
		    "_id": "5433051087adc5161cce89b1",
		    "currentPrice": 449,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/Youshine-Women-Hair-Accessory_13b2b0a8cf2b40d52a1a1aeb3d761396_images.jpg",
		    "productName": "Youshine Multicoloured Beaded Necklace",
		    "productURL": "http://www.myntra.com/Necklace/Youshine/Youshine-Multicoloured-Beaded-Necklace/471630/buy",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 449
		  },
		  {
		    "__v": 0,
		    "_id": "5421574b74d1d6d223a62ce3",
		    "currentPrice": 1249,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/United-Colors-of-Benetton-Men-Pink-Linen-Blend-Casual-Shirt_32b645fa366f3fd8792aaff2425facf2_images.jpg",
		    "productName": "United Colors of Benetton Men Pink Linen Blend Casual Shirt",
		    "productURL": "http://www.myntra.com/Shirts/United-Colors-of-Benetton/United-Colors-of-Benetton-Men-Pink-Linen-Blend-Casual-Shirt/235283/buy",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 1249
		  },
		  {
		    "__v": 0,
		    "_id": "541eadfa326e7002730735cd",
		    "currentPrice": 9995,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/Nike-Men-Sports-Shoes_63f1990937cd551391f247b8bb8c2c1c_images.jpg",
		    "productName": "Nike Men Black Zoom Vomero 9 Sports Shoes",
		    "productURL": "http://www.myntra.com/sports-shoes/nike/nike-men-black-zoom-vomero-9-sports-shoes/266328/buy",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 9995
		  },
		  {
		    "__v": 0,
		    "_id": "54107a3ca34d9755295db276",
		    "currentPrice": 1529,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/Fila-Men-Grey-Rollo-Sports-Sandals_e086cc26ef95cb50d74dbad3f17ffaf8_images.jpg",
		    "productName": "Fila Men Grey Rollo Sports Sandals",
		    "productURL": "http://www.myntra.com/Sports-Sandals/FILA/Fila-Men-Grey-Rollo-Sports-Sandals/353642/buy",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 1259
		  },
		  {
		    "__v": 0,
		    "_id": "54105bc9a34d9755295db273",
		    "currentPrice": 899,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/Reebok-Men-Blue-Drive-II-LP_4cd61d3e3b2952e83d79e3ecf0af0a80_images.jpg",
		    "productName": "Reebok Men Blue Drive II LP Sports Sandals",
		    "productURL": "http://www.myntra.com/Sports-Sandals/Reebok/Reebok-Men-Blue-Drive-II-LP-Sports-Sandals/277823/buy?serp=30&searchQuery=reebok%20offer",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 899
		  },
		  {
		    "__v": 0,
		    "_id": "541059ffa34d9755295db271",
		    "currentPrice": 399,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/Roadster-Men-Maroon-Slim-Fit-Printed-T-shirt_921f0d865a5f97a3dbd096e7bb4d704c_images.JPG",
		    "productName": "Roadster Men Maroon Slim Fit Printed T-shirt",
		    "productURL": "http://www.myntra.com/Tshirts/Roadster/Roadster-Men-Maroon-Slim-Fit-Printed-T-shirt/233050/buy",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 179
		  },
		  {
		    "__v": 0,
		    "_id": "541059d5a34d9755295db26f",
		    "currentPrice": 1619,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/Fila-Men-Brown-Avis-Sports-Sandals_18a31b09c436a442e501b7ea0677fd68_images.jpg",
		    "productName": "Fila Men Brown Avis Sports Sandals",
		    "productURL": "http://www.myntra.com/Sports-Sandals/FILA/Fila-Men-Brown-Avis-Sports-Sandals/353638/buy",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 1439
		  },
		  {
		    "__v": 0,
		    "_id": "53f0ea1b33cd493627f5aba4",
		    "currentPrice": 899,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/W-Women-Navy-Printed-Kurta_f1d33b0f2e2cf5a36fef3bc6f246f654_images.jpg",
		    "productName": "W Women Navy Printed Kurta",
		    "productURL": "http://www.myntra.com/Kurtas/W/W-Women-Navy-Printed-Kurta/377134/buy",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 899
		  },
		  {
		    "__v": 0,
		    "_id": "53d89e0007cde99906e432ae",
		    "currentPrice": 2395,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/Crocs-Women-Flip-Flops_1ed2487ff67f6ab92103756722fd5f30_images.jpg",
		    "productName": "Crocs Women White Duet Flat Shoes",
		    "productURL": "http://www.myntra.com/flats/crocs/crocs-women-white-duet-flat-shoes/158740/buy?src=search&uq=true&q=crocs&p=16",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 1197
		  },
		  {
		    "__v": 0,
		    "_id": "53d48584d831273036964d52",
		    "currentPrice": 1149,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/United-Colors-of-Benetton-White-Linen-Blend-Smart-Casual-Shirt_fc79862558642766926190b97ec1507c_images.jpg",
		    "productName": "United Colors of Benetton White Linen Blend Smart Casual Shirt",
		    "productURL": "http://www.myntra.com/Shirts/United-Colors-of-Benetton/United-Colors-of-Benetton-White-Linen-Blend-Smart-Casual-Shirt/228278/buy",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 1149
		  },
		  {
		    "__v": 0,
		    "_id": "53cfc2794fa5f0755c000008",
		    "alertFromPrice": 3225,
		    "alertToPrice": 2846,
		    "currentPrice": 3036,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/Nike-Men-Casual-Shoes_e551b4ed0372ccd22559a7b707519502_images.jpg",
		    "productName": "Nike Men Dark Blue Liteforce II Mid Casual Shoes",
		    "productURL": "http://www.myntra.com/casual-shoes/nike/nike-men-dark-blue-liteforce-ii-mid-casual-shoes/321697/buy?src=search&uq=&q=men-casual-shoes&p=50",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 1897
		  },
		  {
		    "__v": 0,
		    "_id": "53cfc10e4fa5f0755c000006",
		    "alertFromPrice": 959,
		    "alertToPrice": 799,
		    "currentPrice": 799,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/Peter-England-Men-Blue---White-Striped-Slim-Fit-Casual-Shirt_e1adccbf6b663b506b4388cdff28fedf_images.jpg",
		    "productName": "Peter England Men Blue & White Striped Slim Fit Casual Shirt",
		    "productURL": "http://www.myntra.com/shirts/peter-england/peter-england-men-blue--white-striped-slim-fit-casual-shirt/331344/buy?src=search&uq=&q=men-casual-shirts&p=37",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 799
		  },
		  {
		    "__v": 0,
		    "_id": "53baadc486a7716f76000004",
		    "currentPrice": 2995,
		    "productImage": "http://assets.myntassets.com/v1/images/style/properties/Red-Tape-Men-Brown-Leather-Casual-Shoes_7d9eb7d20944820335141f78202b7bd1_images.jpg",
		    "productName": "Red Tape Men Brown Leather Casual Shoes",
		    "productURL": "http://www.myntra.com/casual-shoes/red-tape/red-tape-men-brown-leather-casual-shoes/218400/buy?src=search&uq=&q=men-casual-shoes&p=6",
		    "eyes": 1,
		    "seller": "myntra",
		    "ltp": 1497
		  },
		  {
		    "__v": 0,
		    "_id": "543662f024977d4c11ca29e0",
		    "currentPrice": 1390,
		    "productImage": "http://catman-a2.infibeam.com/img/poel/8841726/8f/52/ducassodsp2320bbfront94588.jpg.0282ed8f52.999x320x320.jpg",
		    "productName": "Ducasso Black Boy Speaker & FM Player with Alarm Clock",
		    "productURL": "http://www.infibeam.com/Portable_Accessories/i-Ducasso-Speaker-FM-Player-Alarm/P-E-PA-Ducasso-DSP2320BB.html?trackId=adie0d&trackId=aaka",
		    "eyes": 1,
		    "seller": "infibeam",
		    "ltp": 1390
		  },
		  {
		    "__v": 0,
		    "_id": "53df76f39695b77f4e10ecb7",
		    "currentPrice": 479,
		    "productImage": "http://1.fimg.in/p/house-this-1007-940361-1-zoom.jpg",
		    "productName": "House This Solid Ocean Blue Curtain",
		    "productURL": "http://www.fabfurnish.com/House-This-Solid-Ocean-Blue-Curtain-163049.html",
		    "eyes": 1,
		    "seller": "fabfurnish",
		    "ltp": 479
		  },
		  {
		    "__v": 0,
		    "_id": "53b91a1dc50533106400002a",
		    "currentPrice": 296,
		    "productImage": "http://1.fimg.in/p/my-wall-6226-226901-1-zoom.jpg",
		    "productName": "My Wall Keep Calm And Bazinga Black Wall Decal",
		    "productURL": "http://www.fabfurnish.com/My-Wall-Keep-Calm-And-Bazinga-Black-Wall-Decal-109622.html",
		    "eyes": 1,
		    "seller": "fabfurnish",
		    "ltp": 210
		  }
		]
		,
		productActionsClass: 'js-product-actions',
		tmpl: function (data) {
			var priceTypeClasses = 'frown-o price-higher';
			if (data.currentPrice <= data.ltp) {
				priceTypeClasses = 'smile-o price-lower';
			}
			return (
				'<li id="'+data._id+'" class="product-track" data-eyes="'+data.eyes+'" data-filter-class=\'["'+data.seller+'"]\'>'+
					'<figure class="effect-zoe">'+
						'<div class="img-container">'+
							'<img class="lazy" data-original="'+data.productImage+'" alt="'+data.productName+'">'+
						'</div>'+
						'<p class="product-name" title="'+data.productName+'">'+data.productName+'</p>'+
						'<figcaption>'+
							'<h2>'+data.seller+'</h2>'+
							'<i class="fa-3x fa fa-'+priceTypeClasses+'"></i>'+
							'<table class="table table-no-border">'+
								'<tr>'+
									'<td>Current Price:</td>'+
									'<td><i class="fa fa-rupee"></i>'+data.currentPrice+'</td>'+
								'</tr>'+
								'<tr>'+
									'<td>Best known Price:</td>'+
									'<td><i class="fa fa-rupee"></i>'+data.ltp+'</td>'+
								'</tr>'+
							'</table>'+
							'<div class="product-actions clearfix">'+
								'<a title="Buy now" target="_blank" href="'+data.productURL+'" class="js-goto-product"><i class="fa fa-3x fa-shopping-cart"></i></a>'+
								'<a title="Add a price track" class="js-add-track"><i class="fa fa-3x fa-eye"></i></a>'+
							'</div>'+
						'</figcaption>'+
					'</figure>'+
				'</li>'
				);
		},
		render: function (data) {
			var domStr = '';
			_.each(data, function (productData) {
				domStr += ProductTracks.tmpl(productData);
			});

			ProductTracks.$el.html(domStr);

			// Get a reference to your grid items.
			var handler = $('#product-tracks > li'),
				filters = $('#product-filters > li');

			handler.wookmark({
				container: $('#product-tracks'),
				itemWidth: 225,
				autoResize: true,
				align: 'center',
				offset: 20,
				ignoreInactiveItems: false,
				comparator: function(a, b) {
					if (!$(a).hasClass('inactive') && !$(b).hasClass('inactive')) {
						return $(a).data('eyes') > $(b).data('eyes') ? -1 : 1;
					}
					return $(a).hasClass('inactive') && !$(b).hasClass('inactive') ? 1 : -1;
				},
				onLayoutChanged: function () {
					ProductTracks
					.$el
					.find('.product-track:not(.inactive)')
						.find('.lazy')
						.trigger('appear');
				}
			});

			/**
			 * When a filter is clicked, toggle it's active state and refresh.
			 */
			var onClickFilter = function(event) {
				var item = $(event.currentTarget),
					activeFilters = [];

				item.toggleClass('active');

				$('html, body').animate({
					scrollTop: $("#product-tracks").offset().top - 60
				}, 2000);

				// Collect active filter strings
				filters.filter('.active').each(function() {
					activeFilters.push($(this).data('filter'));
				});

				handler.wookmarkInstance.filter(activeFilters, 'or');
				handler.wookmarkInstance.layout(true);
			};

			// Capture filter click events.
			filters.click(onClickFilter);
		},
		lazyLoad: function () {
			var $imgs = ProductTracks.$el.find('.lazy');
			$imgs.lazyload({
				effect : "fadeIn",
				threshold : 100,
				skip_invisible : false,
				failure_limit : Math.max($imgs.length-1, 0)
			});
		},
		init: function () {
			if (window.location.origin.indexOf('localhost') >= 0) {
				ProductTracks.render(ProductTracks.data);
				ProductTracks.lazyLoad();
			} else {
				$.getJSON('/api/tracks', function(data) {
					ProductTracks.render(data);
					ProductTracks.lazyLoad();
				});
			}

			$('#sticker').sticky({topSpacing:0});
		}
	};

	urlForm.$el.on('submit', urlForm.handleURLInputPaste);
	urlForm.$inputEl.on('paste', urlForm.handleURLInputPaste);
	urlForm.$inputEl.on('click', urlForm.handleURLInputClick);

	setInterval(function() {
		Counters.init();
	}, 10000);

	Counters.init();
	LandingBackground.init();
	window.onload = ProductTracks.init;

})(window, jQuery);
