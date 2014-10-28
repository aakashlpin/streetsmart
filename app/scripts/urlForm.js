'use strict';
/* globals _*/
(function($, window) {
	var sellers = ['flipkart.com', 'amazon.in', 'infibeam.com', 'bajaao.com',
	'jabong.com', 'myntra.com', 'pepperfry.com', 'snapdeal.com',
	'fabfurnish.com'];
	var oldUrl = '';

	function isLegitSeller (url) {
		return !!_.find(sellers, function(seller) {
			return url.indexOf(seller) >= 0;
		});
	}

	function getProductInfoDOM (data) {
		return (
			'<p class="alt-font text-italics">'+
				data.productName+
				' currently at &nbsp;<i class="fa fa-rupee"></i>'+
				data.productPrice+
				'/- on '+
				data.seller+
			'</p>'
		);
	}

	function getMessageDOM (msg) {
		msg = msg || 'Sorry! Something went wrong. Please try again.';
		return (
			'<p class="alt-font text-italics">'+msg+'</p>'
		);
	}

	var UrlForm = {
		$el: $('.js-add-url-form'),
		$inputEl: $('.js-add-url-form-input'),
		$emailInputEl: $('.js-add-url-form-email-input'),
		$emailTrigger: $('.js-add-url-to-email'),
		$formUrlGroup: $('.js-url-group'),
		$formEmailGroup: $('.js-email-group'),
		$formUrlContainer: $('#addUrlFormContainer'),
		$formUrlEmailContainer: $('#addUrlEmailFormContainer'),
		$formUrlResponseContainer: $('#addUrlFormResponse'),
		$formUrlLoader: $('.js-url-loader'),
		$formUrlSubmitLoader: $('.js-url-submit-loader'),
		$formUrlResetTrigger: $('.js-form-reset'),
		$formUrlEmailResetTrigger: $('.js-form-reset-stage-one'),
		addUrlResetClass: '.js-form-reset',
		addUrlTriggerClass: '.js-add-url-action',
		bindAllEvents: function () {
			UrlForm.$el.on('submit', UrlForm.handleUrlSubmit);
			UrlForm.$inputEl.on('click', UrlForm.handleUrlInputClick);
			UrlForm.$inputEl.on('change paste', UrlForm.handleUrlInput);
			UrlForm.$emailTrigger.on('click', UrlForm.transitionToEmailInput);
			UrlForm.$formUrlResetTrigger.on('click', UrlForm.handleResetUrlFormTrigger);
			UrlForm.$formUrlEmailResetTrigger.on('click', UrlForm.transitionToUrlInput);
			//bind event bus events
			window.App.eventBus.on('modal:shown', UrlForm.resetUrlForm);
		},
		handleUrlInput: function () {
			setTimeout(function () {
				var $this = $(this);
				var url = $this.val();
				if (oldUrl === url) {
					return;
				}

				UrlForm.$formUrlResponseContainer.empty();

				if (!url.length) {
					return;
				}

				oldUrl = url;

				//disable the input box
				$this.attr('disabled', 'disabled');
				//enable the reset control
				$this.parent().find(UrlForm.addUrlResetClass).addClass('active');

				if (!isLegitSeller(url)) {
					UrlForm.$formUrlResponseContainer.html(getMessageDOM('Sorry! This website is not supported yet!'));
					return;
				}

				if (UrlForm.userMode === 0) {
					UrlForm.$emailTrigger.removeAttr('disabled').addClass('animated pulse css-animation-repeat');

				} else if (UrlForm.userMode === 1) {
					UrlForm.$formUrlContainer.find(UrlForm.addUrlTriggerClass).removeAttr('disabled').addClass('animated pulse');
				}

				UrlForm.$formUrlLoader.show();
				//start fetching the product info

				$.getJSON('/inputurl', {url: url}, function (res) {
					UrlForm.$formUrlLoader.hide();
					if (res.productPrice && res.productName) {
						UrlForm.$formUrlResponseContainer.html(getProductInfoDOM(res));
					} else {
						UrlForm.$formUrlResponseContainer.html(getMessageDOM(res.error));
					}
				});
			}.bind(this), 0);
		},
		handleResetUrlFormTrigger: function (e) {
			var $this = $(this);
			if (!$this.hasClass('active')) {
				return;
			}
			$this.removeClass('active');
			UrlForm.resetUrlForm('#modalUrlForm');
		},
		resetUrlForm: function (modalId) {
			if (modalId !== '#modalUrlForm') {
				return;
			}

			oldUrl = '';
			//empty response container
			UrlForm.$formUrlResponseContainer.empty();

			window.App.User.getUser(function (user) {
				if (!user) {
					UrlForm.userMode = 0;
					UrlForm.$formUrlContainer.hide();

					UrlForm.$formUrlEmailContainer.show()
					.find('.js-add-url-form-input').removeAttr('disabled').val('').focus()
					.end()
					.find('.js-form-reset').removeClass('active')
					.end()
					.find('.js-add-url-to-email').attr('disabled', 'disabled').removeClass('pulse animated');

				} else {
					UrlForm.userMode = 1;
					UrlForm.$formUrlEmailContainer.hide();
					UrlForm.$formUrlContainer.show().find('.js-add-url-form-input').removeAttr('disabled').val('').focus();
					UrlForm.$formUrlContainer.find('.js-hidden-email').attr('value', user.email);
				}
			});
		},
		transitionToUrlInput: function (e) {
			e.preventDefault();
			UrlForm.$formEmailGroup.hide();
			UrlForm.$formUrlGroup.show().addClass('animated bounceInLeft');
			UrlForm.resetUrlForm('#modalUrlForm');
		},
		transitionToEmailInput: function (e) {
			e.preventDefault();
			UrlForm.$formUrlGroup.hide();
			UrlForm.$formEmailGroup.show().addClass('animated bounceInRight').find('.js-modal-input').focus();
		},
		handleUrlInputClick: function (e) {
			$(e.target).select();
		},
		handleUrlSubmit: function (e) {
			//check if email is available
			e.preventDefault();
			var $form = $(this);
			var submitBtn = $form.find(UrlForm.addUrlTriggerClass);

			submitBtn.attr('disabled', 'disabled');
			UrlForm.$formUrlSubmitLoader.show();

			if (UrlForm.userMode === 0) {
				window.App.User.storeAndProcessEmail(UrlForm.$emailInputEl.val());
			}

			var $formInputEl = $form.find('.js-modal-input');

			$formInputEl.removeAttr('disabled');

			$.getJSON('/alert', $form.serialize(), function (res) {
				console.log(res);
				UrlForm.$formUrlSubmitLoader.hide();
				UrlForm.$formUrlResponseContainer.html(getMessageDOM(res.error || res.status));
				$formInputEl.attr('disabled', 'disabled');

				// submitBtn.removeAttr('disabled');
				// if (res.error || res.code === 'error') {
				// 	return;
				// }

				// UrlForm.$formUrlResponseContainer.html(getMessageDOM(res.status));
			});
		},
		init: function () {
			UrlForm.bindAllEvents();
		}
	};

	window.App.UrlForm = UrlForm;

})(jQuery, window);