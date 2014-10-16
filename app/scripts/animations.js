'use strict';

(function($, window) {
	window.odometerOptions = {
	  auto: true, // Don't automatically initialize everything with class 'odometer'
	  selector: '#ca-counters-emails', // Change the selector used to automatically find things to be animated
	  format: '(,ddd).dd', // Change how digit groups are formatted, and how many digits are shown after the decimal point
	  // duration: 1000, // Change how long the javascript expects the CSS animation to take
	  // theme: 'car', // Specify the theme (if you have more than one theme css file on the page)
	  animation: 'count' // Count is a simpler animation method which just increments the value,
						 // use it when you're looking for something more subtle.
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

	var SocialProof = {
		$el: $('#social-proof'),
		init: function () {
			//there's a problem with async nature of twitter embedding
			setTimeout(function() {
				var handler = SocialProof.$el.find('>li');
				handler.wookmark({
					container: SocialProof.$el
				});
			}, 2000);
		}
	}

	window.App.Counters = Counters;
	window.App.LandingBackground = LandingBackground;
	window.App.SocialProof = SocialProof;

})(jQuery, window);