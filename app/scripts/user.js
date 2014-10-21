'use strict';
/*globals Odometer*/

(function ($, window) {
	function getLocalStorageEmail () {
		return localStorage.getItem('userEmail');	//will be null if not found
	}

	var User = {
		$el: $('.js-tracking-email-container'),
		$userEmail: $('.js-tracking-email'),
		$userAlerts: $('.js-tracking-alerts'),
		currentAlertsCount: 0,
		addEventListeners: function () {
			var eventBus = window.App.eventBus;
			eventBus.on('track:added', User.plusOneAlertsCount);
		},
		initOdometer: function (val) {
			var odometer = new Odometer({
				el: User.$userAlerts[0],
				duration: 500,
				theme: 'plaza'
			});

			odometer.render();
			odometer.update(val);
		},
		init: function () {
			var storedEmail = getLocalStorageEmail();
			if (!storedEmail) {
				return;
			}

			$.getJSON('/user/' + encodeURIComponent(storedEmail), function (res) {
				if (!res.id) {
					return;
				}

				User.$userEmail.html(storedEmail);
				User.$userAlerts.html(res.alerts);
				User.$el.show();

				//init the count
				User.currentAlertsCount = res.alerts;
				User.initOdometer(res.alerts);
			});

			User.addEventListeners();
		},
		plusOneAlertsCount: function () {
			User.currentAlertsCount += 1;
			User.$userAlerts.html(User.currentAlertsCount);
		}
	};

	window.App.User = User;

})(jQuery, window);