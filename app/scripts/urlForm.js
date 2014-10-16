'use strict';
/* global _ */

(function($, window){
	var FinalSubmissionForm = {
		el: '#fkSubmissionForm',
		reloadBtn: '#reloadBtn',
		handleFormSubmit: function(e) {
			e.preventDefault();
			var payload = $(this).serialize();
			var inputEmailDOM = $('#inputEmail');
			var submitBtn = $('#submitBtn');
			var reloadBtn = $('#reloadBtn');
			var messageContainer = $('#queueResponse');
			var email = inputEmailDOM.val();
			submitBtn.attr('disabled', 'disabled');
			FinalSubmissionForm.saveEmailLocally(email);
			$.getJSON('/queue', payload, function(res) {
				var message = res.status;
				inputEmailDOM.attr('disabled', 'disabled');
				submitBtn.hide();
				reloadBtn.removeClass('hide');
				messageContainer.removeClass('hide').hide().find('.js-queue-response').html(message).end().fadeIn();
			});
		},
		saveEmailLocally: function(email) {
			if ('localStorage' in window) {
				localStorage.setItem('userEmail', email);
			}
		},
		resetState: function(e) {
			e.preventDefault();
			location.reload();
		}
	};


	var urlForm = {
		$el: $('#fkURLForm'),
		$inputEl: $('#productPageURL'),
		oldURL: null,
		sellers: ['flipkart.com', 'amazon.in', 'infibeam.com', 'bajaao.com',
		'jabong.com', 'myntra.com', 'pepperfry.com', 'snapdeal.com',
		'fabfurnish.com'],
		isLegitSeller: function(url) {
			var sellers = urlForm.sellers;
			return !!_.find(sellers, function(seller) {
				return url.indexOf(seller) >= 0;
			});
		},
		handleURLInputClick: function(e) {
			$(e.target).select();
		},
		handleURLInputPaste: function(evt) {
			var tmpl, clone;
			function process() {
				//setTimeout is necessary to ensure that the content actually gets pasted
				var url = $.trim(urlForm.$inputEl.val());
				var responseContainer = document.querySelector('#response-container');

				if (!urlForm.isLegitSeller(url)) {
					tmpl = document.querySelector('#illegalSeller');
					clone = document.importNode(tmpl.content, true);
					responseContainer.innerHTML = '';
					responseContainer.appendChild(clone);
				}

				if (urlForm.isLegitSeller(url) && (url !== urlForm.oldURL)) {
					//using oldURL as a previously entered whatever
					urlForm.oldURL = url;
					urlForm.$inputEl.attr('disabled', 'disabled');
					tmpl = document.querySelector('#loader');
					clone = document.importNode(tmpl.content, true);
					responseContainer.innerHTML = '';
					responseContainer.appendChild(clone);

					$.getJSON('/inputurl', {url: url}, function(res) {
						if (!res.productPrice) {
							// if (supportsTemplate()) {
							tmpl = document.querySelector('#illegalProductPage');
							clone = document.importNode(tmpl.content, true);
							responseContainer.innerHTML = '';
							responseContainer.appendChild(clone);
							urlForm.$inputEl.removeAttr('disabled').click();
							// }
							return;
						}

						urlForm.$inputEl.removeAttr('disabled');
						var priceVal = res.productPrice,
						nameVal = res.productTitle,
						imageVal = res.productImage;

						tmpl = document.querySelector('#tmplNotifyMe');
						var tmplContent = tmpl.content;
						var titleDOM = tmplContent.querySelector('#product-title');
						var priceDOM = tmplContent.querySelector('#product-price');
						var imageDOM = tmplContent.querySelector('#product-image');
						var productURLDOM = tmplContent.querySelector('#productURL');
						var productPriceDOM = tmplContent.querySelector('#currentPrice');
						var productNameDOM = tmplContent.querySelector('#productName');
						var productImageDOM = tmplContent.querySelector('#productImage');

						titleDOM.textContent = nameVal;
						priceDOM.textContent = priceVal;
						imageDOM.src = imageVal;
						imageDOM.alt = nameVal;

						//hidden input fields
						productURLDOM.value = url;
						productNameDOM.value = nameVal;
						productPriceDOM.value = priceVal;
						productImageDOM.value = imageVal;

						//clone this new template and put it in response container
						clone = document.importNode(tmpl.content, true);
						responseContainer.innerHTML = '';
						responseContainer.appendChild(clone);

						var inputEmailClonedDOM = $('#inputEmail');
						if ('localStorage' in window) {
							var userEmail = localStorage.getItem('userEmail');
							if (userEmail) {
								inputEmailClonedDOM.val(userEmail);
							}
						}

						inputEmailClonedDOM.focus();

						//bind the event here
						//TODO emit events here instead of calling module
						$(FinalSubmissionForm.el).on('submit', FinalSubmissionForm.handleFormSubmit);
						$(FinalSubmissionForm.reloadBtn).on('click', FinalSubmissionForm.resetState);

					});
				}
			}

			if (evt.type === 'submit') {
				evt.preventDefault();
				process.call(this);
			} else {
				setTimeout(process.bind(this), 0);
			}
		}
	};

	window.App.FinalSubmissionForm = FinalSubmissionForm;
	window.App.urlForm = urlForm;

})(jQuery, window);
