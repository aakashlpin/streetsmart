'use strict';
(function($) {
    //stub out some ajax requests
    $.mockjax({
        url: '/inputurl',
        contentType: 'text/json',
        responseTime: 2000,
        responseText: {
            name: 'Apple iPhone 5S',
            image: 'http://img5a.flixcart.com/image/mobile/z/h/f/apple-iphone-5s-400x400-imadpppc54zfpj9c.jpeg',
            price: 45940,
            time: new Date()
        }
    });

    //this request on server side should do these things in order
    //1. Check if the email is verified on server
    //  1.1. if step 1 is false => Send out an email verification request
    //  1.2. if step 1 is true => Queue the request for processing. Limit to 3?
    $.mockjax({
        url: '/queue',
        contentType: 'text/json',
        responseTime: 1000,
        responseText: {
            status: 'Sweet! We\'ll keep you posted as the price changes.'
        }
    });
})(jQuery);

(function(window, $) {
    function supportsTemplate() {
        return ('content' in document.createElement('template'));
    }

    var urlForm = {
        $el: $('#fkURLForm'),
        $inputEl: $('#productPageURL'),
        oldURL: null,
        handleURLInputClick: function(e) {
            $(e.target).select();
        },
        handleURLInputPaste: function(evt) {
            if (evt.type === 'submit') {
                evt.preventDefault();
            }
            
            setTimeout(function() {
                var url;
                //setTimeout is necessary to ensure that the content actually gets pasted
                if (evt.type === 'submit') {
                    url = $.trim(urlForm.$inputEl.val());
                    evt.preventDefault();

                } else {
                    url = $.trim($(evt.target).val());
                }
                if ((url.indexOf('flipkart.com') > 0) &&
                    (url !== urlForm.oldURL)) {
                    //lets just assume this is a valid url
                    urlForm.oldURL = url;
                    urlForm.$inputEl.attr('disabled', 'disabled');

                    var responseContainer = document.querySelector('#response-container');

                    if (supportsTemplate()) {
                        var tmpl = document.querySelector('#loader');
                        var clone = document.importNode(tmpl.content, true);
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
                            var inputEmailDOM = tmplContent.querySelector('#inputEmail');
                            // var sellerDOM = tmpl.content.querySelector('#seller');

                            titleDOM.textContent = nameVal;
                            priceDOM.textContent = priceVal;
                            imageDOM.src = imageVal;
                            imageDOM.alt = nameVal;

                            //hidden input fields
                            productURLDOM.value = url;
                            productNameDOM.value = nameVal;
                            productPriceDOM.value = priceVal;
                            productImageDOM.value = imageVal;

                            if ('localStorage' in window) {
                                var userEmail = localStorage.getItem('userEmail');
                                if (userEmail) {
                                    inputEmailDOM.value = userEmail;
                                }
                            }

                            //clone this new template and put it in response container
                            clone = document.importNode(tmpl.content, true);
                            responseContainer.innerHTML = '';
                            responseContainer.appendChild(clone);
                            $('#inputEmail').focus();

                            //bind the event here
                            $(FinalSubmissionForm.el).on('submit', FinalSubmissionForm.handleFormSubmit);

                        }

                    });
                }


            }.bind(this), 0);
        }
    };


    var FinalSubmissionForm = {
        el: '#fkSubmissionForm',
        handleFormSubmit: function(e) {
            e.preventDefault();
            var payload = $(this).serialize();
            var email = $('#inputEmail').val();
            FinalSubmissionForm.saveEmailLocally(email);
            $.getJSON('/queue', payload, function(res) {
                console.log(res);
            });
        },
        saveEmailLocally: function(email) {
            if ('localStorage' in window) {
                localStorage.setItem('userEmail', email);
            }
        }
    };

    urlForm.$el.on('submit', urlForm.handleURLInputPaste);
    urlForm.$inputEl.on('paste', urlForm.handleURLInputPaste);
    urlForm.$inputEl.on('click', urlForm.handleURLInputClick);

})(window, jQuery);
