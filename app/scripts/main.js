'use strict';
/*globals App*/

(function($, window) {
	App = window.App;

	setInterval(function() {
		App.Counters.init();
	}, 20000);

	App.UrlForm.init();
	App.Counters.init();
	App.LandingBackground.init();
	App.SocialProof.init();
	App.User.init();

	//begin loading the products on home page
	window.onload = App.ProductTracks.init;

	var body = document.body,
    timer;

	window.addEventListener('scroll', function() {
	  clearTimeout(timer);
	  if(!body.classList.contains('disable-hover')) {
	    body.classList.add('disable-hover')
	  }

	  timer = setTimeout(function(){
	    body.classList.remove('disable-hover')
	  },500);
	}, false);
})(jQuery, window);
