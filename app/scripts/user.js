'use strict';
/*globals Odometer, noty, _*/

(function ($, window) {
	var unverifiedEmailClass = 'css-user-unverified';
	var verifiedEmailClass = 'css-user-verified';
	var notfoundEmailClass = 'css-user-notfound';
	var timeoutCounter = 0;

	function getLocalStorageEmail () {
		return localStorage.getItem('userEmail');	//will be null if not found
	}

	function getUserDetails (email, callback) {
		$.getJSON('/user/' + encodeURIComponent(email), callback);
	}

	function render (user, userStatus) {
		var emailTitle;

		if (userStatus === -1) {
			//user not found
			emailTitle = 'Track a product to receive a one-time verification email';
			User.$userEmail
			.removeClass(unverifiedEmailClass).removeClass(verifiedEmailClass)
			.addClass(notfoundEmailClass);

		} else if (userStatus === 0) {
			//unverified user
			emailTitle = 'Click to resend verification email';
			User.$userEmail
			.removeClass(notfoundEmailClass).removeClass(verifiedEmailClass)
			.addClass(unverifiedEmailClass);

		} else {
			//verified user
			emailTitle = 'Goto your Dashboard';
			User.$userEmail
			.removeClass(unverifiedEmailClass).removeClass(notfoundEmailClass)
			.addClass(verifiedEmailClass)
			.attr('href', '//cheapass.in/dashboard/' + user.id);
		}

		if (userStatus === -1 || userStatus === 0) {
			User.$userEmail.removeAttr('href');
		}

		User.$userEmail
		.html(user.email)
		.attr({'data-original-title': emailTitle});

		User.$userAlerts.html(user.alerts);
		User.$el.show();

		//initialize tooltip elems
		User.$userEmail.tooltip({placement: 'left'});
		User.$userAlerts.tooltip({placement: 'left'});
		User.$editUserTrigger.tooltip({placement: 'left'});

		//init the count
		User.currentAlertsCount = user.alerts;
		User.initOdometer(user.alerts);
	}

	function resetInterval () {
		clearInterval(timeoutCounter);
		timeoutCounter = null;
	}

	function showUserNotFoundUI (user) {
		user.alerts = 0;
		render(user, -1);
	}

	function showUnverifiedEmailUI (user) {
		render(user, 0);
	}

	function showVerifiedEmailUI (user) {
		render(user, 1);
	}

	function getAndProcessUser (email, shouldClearInterval) {
		getUserDetails(email, function (user) {
			user.email = email;
			if (user.status === 'error') {
				//user not found.
				//render unverified ui
				showUserNotFoundUI(user);
				//keep checking if email verified
				pollIfVerified(user);

			} else if (user.status === 'pending') {
				//user has added tracks but not verified email
				showUnverifiedEmailUI(user);
				//keep checking if email verified
				pollIfVerified(user);

			} else {
				//verified user
				if (shouldClearInterval) {
					resetInterval();
				}
				showVerifiedEmailUI(user);
			}
		});

	}

	function pollIfVerifiedImpl (user) {
		getAndProcessUser(user.email, true);
	}

	function pollIfVerified (user) {
		if (timeoutCounter) {
			return;
		}
		timeoutCounter = setInterval(pollIfVerifiedImpl.bind(User, user), 5000);
	}

	var User = {
		$el: $('.js-tracking-email-container'),
		$userEmail: $('.js-tracking-email'),
		$userAlerts: $('.js-tracking-alerts'),
		$editUser: $('.js-accept-email-form'),
		$editUserTrigger: $('.js-edit-user-trigger'),
		$emailInput: $('#email'),
		currentAlertsCount: 0,
		notyDefaults: {
			layout: 'topCenter',
			type: 'information',
			dismissQueue: true,
			force: true,
			timeout: 5000,
			maxVisible: 2
		},
		addEventListeners: function () {
			var eventBus = window.App.eventBus;
			eventBus.on('track:added', User.plusOneAlertsCountHandler);
			eventBus.on('user:initiated', User.storeAndProcessEmail);

			User.$editUser.on('submit', User.editUser);
			User.$userEmail.on('click', User.resendVerificationEmail);
		},
		resendVerificationEmail: function (e) {
			if (!$(this).hasClass(unverifiedEmailClass)) {
				return;
			}
			e.preventDefault();
			$.getJSON('/user/verify/' + encodeURIComponent(getLocalStorageEmail()), function (res) {
				var notificationText, notificationType;
				if (res.error) {
					notificationText = res.error;
					notificationType = 'warning';
				} else {
					notificationText = res.status;
					notificationType = 'information';
				}

				noty(_.extend({}, User.notyDefaults, {
					type: notificationType,
					text: notificationText
				}));
			});
		},
		editUser: function (e) {
			e.preventDefault();
			var eventBus = window.App.eventBus;
			var promptEmail = User.$emailInput.val();
			eventBus.emit('modal:close', promptEmail);

			if (timeoutCounter) {
				//just in case polling is happening in the background, stop it
				resetInterval();
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

			getAndProcessUser(storedEmail, false);
		},
		init: function () {
			//bind all events
			User.addEventListeners();
			//process local email
			User.processLocalStorageEmail();
		},
		plusOneAlertsCountHandler: function (res) {
			if (!res.error) {
				User.plusOneAlertsCount();
			} else {
				noty(_.extend({}, User.notyDefaults, {
					text: res.error
				}));
			}
		},
		plusOneAlertsCount: function () {
			User.currentAlertsCount += 1;
			User.$userAlerts.html(User.currentAlertsCount);
		}
	};

	window.App.User = User;

})(jQuery, window);