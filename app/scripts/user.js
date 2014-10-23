'use strict';
/*globals Odometer*/

(function ($, window) {
	var unverifiedEmailClass = 'css-user-unverified';
	var verifiedEmailClass = 'css-user-verified';
	var timeoutCounter = 0;

	function getLocalStorageEmail () {
		return localStorage.getItem('userEmail');	//will be null if not found
	}

	function getUserDetails (email, callback) {
		$.getJSON('/user/' + encodeURIComponent(email), callback);
	}

	function render (user, verified) {
		var emailTitle;

		if (verified) {
			emailTitle = 'Goto your Dashboard';

			User
			.$userEmail
			.removeClass(unverifiedEmailClass)
			.addClass(verifiedEmailClass)
			.attr('href', '//cheapass.in/dashboard/' + user.id)
			;

		} else {
			emailTitle = 'Click to resend verification email';

			User
			.$userEmail
			.removeClass(verifiedEmailClass)
			.addClass(unverifiedEmailClass)
			.removeAttr('href')
			;
		}

		User
		.$userEmail
		.html(user.email)
		.attr({
			'title': emailTitle,
			'data-original-title': emailTitle
		});

		User.$userAlerts.html(user.alerts);
		User.$el.show();

		User.$userEmail.tooltip({
			placement: 'left'
		});

		User.$userAlerts.tooltip({
			placement: 'left'
		});

		User.$editUser.tooltip({
			placement: 'left'
		});

		//init the count
		User.currentAlertsCount = user.alerts;
		User.initOdometer(user.alerts);
	}

	function showUnverifiedEmailUI (user) {
		user.alerts = 0;
		render(user, false);
	}

	function showVerifiedEmailUI (user) {
		render(user, true);
	}

	function pollIfVerifiedImpl (user) {
		getUserDetails(user.email, function (userDoc) {
			if (userDoc.id) {
				//user verified.
				clearInterval(timeoutCounter);
				showVerifiedEmailUI(userDoc);
			}
		});
	}

	function pollIfVerified (user) {
		timeoutCounter = setInterval(pollIfVerifiedImpl.bind(this, user), 5000);
	}

	var User = {
		$el: $('.js-tracking-email-container'),
		$userEmail: $('.js-tracking-email'),
		$userAlerts: $('.js-tracking-alerts'),
		$editUser: $('.js-change-user'),
		currentAlertsCount: 0,
		addEventListeners: function () {
			var eventBus = window.App.eventBus;
			eventBus.on('track:added', User.plusOneAlertsCount);
			eventBus.on('user:initiated', User.storeAndProcessEmail);

			User.$editUser.on('click', User.editUser);
		},
		editUser: function (e) {
			e.preventDefault();
			var promptEmail = prompt('Email?');
			if (!promptEmail) {
				return;
			}
			User.storeAndProcessEmail(promptEmail);
		},
		initOdometer: function (val) {
			val = val || 0;
			var odometer = new Odometer({
				el: User.$userAlerts[0],
				duration: 1500,
				theme: 'plaza'
			});

			odometer.render();
			odometer.update(val);
		},
		storeAndProcessEmail: function (email) {
			localStorage.setItem('userEmail', email);
			User.processLocalStorageEmail();
		},
		processLocalStorageEmail: function () {
			var storedEmail = getLocalStorageEmail();
			if (!storedEmail) {
				return;
			}

			getUserDetails(storedEmail, function (user) {
				if (!user.id) {
					//user not found.
					user = { email: storedEmail };
					//keep checking if email verified
					pollIfVerified(user);
					//render unverified ui
					showUnverifiedEmailUI(user);
					return;
				}

				showVerifiedEmailUI(user);
			});
		},
		init: function () {
			//bind all events
			User.addEventListeners();
			//process local email
			User.processLocalStorageEmail();
		},
		plusOneAlertsCount: function () {
			User.currentAlertsCount += 1;
			User.$userAlerts.html(User.currentAlertsCount);
		}
	};

	window.App.User = User;

})(jQuery, window);