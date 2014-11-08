'use strict';
/*globals analytics*/
(function($) {
	$('.js-noop').on('click', function (e) {
		e.preventDefault();
		analytics.track('Attempted clicking on Bookmarklet');
	});
})(jQuery);