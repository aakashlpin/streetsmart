/* global _ */
'use strict';
// (function($) {
//     //stub out some ajax requests
//     $.mockjax({
//         url: '/inputurl',
//         contentType: 'text/json',
//         responseTime: 2000,
//         responseText: {
//             name: 'Apple iPhone 5S',
//             image: 'http://img5a.flixcart.com/image/mobile/z/h/f/apple-iphone-5s-400x400-imadpppc54zfpj9c.jpeg',
//             price: 45940,
//             time: new Date()
//         }
//     });
//
//     //this request on server side should do these things in order
//     //1. Check if the email is verified on server
//     //  1.1. if step 1 is false => Send out an email verification request
//     //  1.2. if step 1 is true => Queue the request for processing. Limit to 3?
//     $.mockjax({
//         url: '/queue',
//         contentType: 'text/json',
//         responseTime: 1000,
//         responseText: {
//             status: 'Sweet! We\'ll keep you posted as the price changes.'
//         }
//     });
// })(jQuery);

(function(window, $) {
    function supportsTemplate() {
        if ('content' in document.createElement('template')) {
            return true;
        }  else {
            //TODO put a GA tracking event here
        }
    }

    var urlForm = {
        $el: $('#fkURLForm'),
        $inputEl: $('#productPageURL'),
        oldURL: null,
        sellers: ['flipkart.com', 'amazon.in'],
        isLegitSeller: function(url) {
            var sellers = urlForm.sellers;
            return _.find(sellers, function(seller) {
                return url.indexOf(seller) >= 0;
            });
        },
        handleURLInputClick: function(e) {
            $(e.target).select();
        },
        handleURLInputPaste: function(evt) {
            if (evt.type === 'submit') {
                evt.preventDefault();
            }

            var tmpl, clone;
            setTimeout(function() {
                //setTimeout is necessary to ensure that the content actually gets pasted
                var url = $.trim(urlForm.$inputEl.val());
                var responseContainer = document.querySelector('#response-container');

                if (!urlForm.isLegitSeller(url)) {
                    if (supportsTemplate()) {
                        tmpl = document.querySelector('#illegalSeller');
                        clone = document.importNode(tmpl.content, true);
                        responseContainer.innerHTML = '';
                        responseContainer.appendChild(clone);
                    }
                }

                if (urlForm.isLegitSeller(url) && (url !== urlForm.oldURL)) {
                    //lets just assume this is a valid url
                    urlForm.oldURL = url;
                    urlForm.$inputEl.attr('disabled', 'disabled');

                    if (supportsTemplate()) {
                        tmpl = document.querySelector('#loader');
                        clone = document.importNode(tmpl.content, true);
                        responseContainer.innerHTML = '';
                        responseContainer.appendChild(clone);
                    }

                    $.getJSON('/inputurl', {url: url}, function(res) {
                        if (!res.price) {
                            if (supportsTemplate()) {
                                tmpl = document.querySelector('#illegalProductPage');
                                clone = document.importNode(tmpl.content, true);
                                responseContainer.innerHTML = '';
                                responseContainer.appendChild(clone);
                                urlForm.$inputEl.removeAttr('disabled').click();
                            }
                            return;
                        }

                        urlForm.$inputEl.removeAttr('disabled');
                        var priceVal = res.price,
                        nameVal = res.name,
                        imageVal = res.image;

                        if (supportsTemplate()) {
                            //only if the browser supports template tag natively
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
                            $(FinalSubmissionForm.el).on('submit', FinalSubmissionForm.handleFormSubmit);
                            $(FinalSubmissionForm.reloadBtn).on('click', FinalSubmissionForm.resetState);

                        }

                    });
                }


            }.bind(this), 0);
        }
    };


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
        resetState: function() {
            location.reload();
        }
    };

    urlForm.$el.on('submit', urlForm.handleURLInputPaste);
    urlForm.$inputEl.on('paste', urlForm.handleURLInputPaste);
    urlForm.$inputEl.on('click', urlForm.handleURLInputClick);

})(window, jQuery);
