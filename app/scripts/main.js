'use strict';
/*globals App*/

(function($, window) {
	App = window.App;

	setInterval(function() {
		App.Counters.init();
	}, 10000);

	App.UrlForm.init();
	App.Counters.init();
	App.LandingBackground.init();
	App.SocialProof.init();
	App.User.init();

	//begin loading the products on home page
	window.onload = App.ProductTracks.init;
})(jQuery, window);
