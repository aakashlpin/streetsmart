'use strict';
/*globals App*/

(function($, window) {
	App = window.App;

	App.urlForm.$el.on('submit', App.urlForm.handleURLInputPaste);
	App.urlForm.$inputEl.on('paste', App.urlForm.handleURLInputPaste);
	App.urlForm.$inputEl.on('click', App.urlForm.handleURLInputClick);

	setInterval(function() {
		App.Counters.init();
	}, 10000);

	App.Counters.init();
	App.LandingBackground.init();
	App.SocialProof.init();
	App.User.init();

	//begin loading the products on home page
	window.onload = App.ProductTracks.init;

})(jQuery, window);
