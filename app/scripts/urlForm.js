'use strict';
/* globals _*/
(function($, window) {
	var sellers = ['flipkart.com', 'amazon.in', 'infibeam.com', 'bajaao.com',
	'jabong.com', 'myntra.com', 'pepperfry.com', 'snapdeal.com',
	'fabfurnish.com'];

	function isValidUrl(str) {
		var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
		'((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
		'((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
		'(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
		'(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
		'(\\#[-a-z\\d_]*)?$','i'); // fragment locator

		if(!pattern.test(str)) {
			return false;
		} else {
			return true;
		}
	}

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

	function getErrorDOM (msg) {
		msg = msg || 'Sorry! Something went wrong. Please try again.';
		return (
			'<p class="alt-font text-italics">'+msg+'</p>'
		);
	}

	var UrlForm = {
		$el: $('#addUrlForm'),
		$inputEl: $('.js-add-url-form-input'),
		$emailTrigger: $('.js-add-url-to-email'),
		$formUrlGroup: $('.js-url-group'),
		$formEmailGroup: $('.js-email-group'),
		$formUrlContainer: $('#addUrlFormContainer'),
		$formUrlEmailContainer: $('#addUrlEmailFormContainer'),
		$formUrlResponseContainer: $('#addUrlFormResponse'),
		$formUrlLoader: $('.js-url-loader'),
		addUrlTriggerClass: '.js-add-url-action',
		bindAllEvents: function () {
			UrlForm.$el.on('submit', UrlForm.handleURLSubmit);
			UrlForm.$inputEl.on('click', UrlForm.handleURLInputClick);
			UrlForm.$inputEl.on('change paste', UrlForm.handleUrlInput);
			UrlForm.$emailTrigger.on('click', UrlForm.transitionToEmailInput);
			//bind event bus events
			window.App.eventBus.on('modal:shown', UrlForm.resetUrlForm);
		},
		handleUrlInput: function () {
			setTimeout(function () {
				//TODO add a check for oldUrl being same as new url
				UrlForm.$formUrlResponseContainer.empty();

				var url = $(this).val();
				if (url.length && isValidUrl(url)) {
					if (!isLegitSeller(url)) {
						UrlForm.$formUrlResponseContainer.html(getErrorDOM('Sorry! This website is not supported yet!'));
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
							UrlForm.$formUrlResponseContainer.html(getErrorDOM(res.error));
						}
					});
				}
			}.bind(this), 0);
		},
		resetUrlForm: function (modalId) {
			if (modalId !== '#modalUrlForm') {
				return;
			}
			window.App.User.getUser(function (user) {
				if (!user) {
					UrlForm.userMode = 0;
					UrlForm.$formUrlContainer.hide();
					UrlForm.$formUrlEmailContainer.show();
				} else {
					UrlForm.userMode = 1;
					UrlForm.$formUrlContainer.show();
					UrlForm.$formUrlEmailContainer.hide();
				}
			});
		},
		transitionToEmailInput: function (e) {
			e.preventDefault();
			UrlForm.$formUrlGroup.hide();
			UrlForm.$formEmailGroup.show().addClass('animated bounceInRight').find('.js-modal-input').focus();
		},
		handleURLInputClick: function (e) {
			$(e.target).select();
		},
		handleURLSubmit: function (e) {
				//check if email is available
				e.preventDefault();
				// $.getJSON('/alert', )
			},
			init: function () {
				UrlForm.bindAllEvents();
			}
	};

	window.App.UrlForm = UrlForm;

})(jQuery, window);