'use strict';
/*globals twttr, Odometer*/

(function($, window) {
	var Counters = {
		// $usersCount: $('#ca-counters-users'),
		// $itemsCount: $('#ca-counters-products'),
		$emailsCount: $('#ca-counters-emails'),
		init: function() {
			$.getJSON('/stats', function(res) {
				// Counters.$usersCount.html(res.totalUsers);
				// Counters.$itemsCount.html(res.itemsTracked);
				Counters.$emailsCount.html(res.emailsSent);
				var odometer = new Odometer({
					el: Counters.$emailsCount[0],
					duration: 1500,
					theme: 'car'
				});
				odometer.render();
				odometer.update(res.emailsSent);
			});
		}
	};

	var LandingBackground = {
		$el: $('.landing-image'),
		imgSrc: function () {
			//depending on window width, return the image
			var width = $(window).width();
			if (width <= 320) {
				return '../img/cover_320.jpg';
			} else if (width > 320 && width <= 700) {
				return '../img/cover_700.jpg';
			} else if (width > 700 && width <= 1300) {
				return '../img/cover_1300.jpg';
			} else if (width > 1300) {
				return '../img/cover_1600.jpg';
			}
		},
		init: function () {
			var bgImg = new Image();
			bgImg.onload = function(){
			   LandingBackground.$el.css({
					'background-image': 'url(' + bgImg.src + ')'
			   })
			   .addClass('animated fadeIn');
			};
			bgImg.src = LandingBackground.imgSrc();
		}
	};

	var SocialProof = {
		$el: $('#social-proof'),
		init: function () {
			twttr.events.bind(
				'loaded',
				function () {
					var handler = SocialProof.$el.find('>li');
					var windowWidth = $(window).width();

					if (windowWidth < 700) {
						return;
					}

					handler.each(function() {
						//hack for safari (width returned as 0)
						$(this).css({
							height: $(this).height() + 'px',
							width: ($(this).width() || 330) + 'px'
						});
					});

					handler.wookmark({
						container: SocialProof.$el,
						autoResize: true
					});
				}
			);
		}
	};

	window.App.Counters = Counters;
	window.App.LandingBackground = LandingBackground;
	window.App.SocialProof = SocialProof;

})(jQuery, window);