'use strict';
/* globals _, analytics*/
(function($, window) {
	var oldUrl = '';

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
			UrlForm.$inputEl.on('change keyup', UrlForm.handleUrlInput);
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

				//enable the reset control
				$this.parent().find(UrlForm.addUrlResetClass).addClass('active');

				UrlForm.$emailTrigger.removeAttr('disabled').addClass('animated pulse css-animation-repeat');
			}.bind(this), 0);
		},
		handleResetUrlFormTrigger: function () {
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

			UrlForm.$formUrlEmailContainer
			.find('.js-add-url-form-input').removeAttr('disabled').val('').focus()
			.end()
			.find('.js-form-reset').removeClass('active')
			.end()
			.find('.js-add-url-to-email').attr('disabled', 'disabled').removeClass('pulse animated');
		},
		transitionToUrlInput: function (e) {
			if (e) {
				e.preventDefault();
			}
			UrlForm.$formEmailGroup.hide();
			UrlForm.$formUrlGroup.show().addClass('animated bounceInLeft');
			UrlForm.resetUrlForm('#modalUrlForm');
		},
		transitionToEmailInput: function (e) {
			if (e) {
				e.preventDefault();
			}
			UrlForm.$formUrlGroup.hide();
			UrlForm.$formEmailGroup.show().addClass('animated bounceInRight').find('.js-modal-input').focus();
			analytics.track('New User via Instant Alert transitions to Email');
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

			var $formInputEl = $form.find('.js-modal-input');

			$formInputEl.removeAttr('disabled');

			$.getJSON('/queue', $form.serialize())
				.done(function (res) {
					UrlForm.$formUrlResponseContainer.html(getMessageDOM(res.status));
					$formInputEl.attr('disabled', 'disabled');
				})
				.fail(function (jqxhr, textStatus, error) {
					var error = jqxhr.responseJSON.error;
					UrlForm.$formUrlResponseContainer.html(getMessageDOM(error));
					submitBtn.removeAttr('disabled');
				})
				.always(function () {
					UrlForm.$formUrlSubmitLoader.hide();
				})
		},
		init: function () {
			UrlForm.bindAllEvents();
		}
	};

	window.App.UrlForm = UrlForm;

})(jQuery, window);
