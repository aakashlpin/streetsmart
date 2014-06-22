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
        handleURLInput: function() {
            var args = Array.prototype.slice.call(arguments, 0);
            if (args.length === 1) {
                //I don't know how to say if the argument is an event
                //assuming it to be an event
                var evt = args[0];
                var url = $.trim($(evt.target).val());
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
                            //TODO handle error
                            return;
                        }

                        urlForm.$inputEl.removeAttr('disabled');
                        var priceVal = res.price,
                            nameVal = res.name,
                            imageVal = res.image;

                        if (supportsTemplate()) {
                            //only if the browser supports template tag natively
                            var tmpl = document.querySelector('#tmplNotifyMe');
                            var titleDOM = tmpl.content.querySelector('#product-title');
                            var priceDOM = tmpl.content.querySelector('#product-price');
                            var imageDOM = tmpl.content.querySelector('#product-image');
                            var productURLDOM = tmpl.content.querySelector('#productURL');
                            var productPriceDOM = tmpl.content.querySelector('#currentPrice');
                            var productNameDOM = tmpl.content.querySelector('#productName');
                            var productImageDOM = tmpl.content.querySelector('#productImage');
                            var inputEmailDOM = tmpl.content.querySelector('#inputEmail');
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
                            var clone = document.importNode(tmpl.content, true);
                            responseContainer.innerHTML = '';
                            responseContainer.appendChild(clone);

                            //bind the event here
                            $(FinalSubmissionForm.el).on('submit', FinalSubmissionForm.handleFormSubmit);

                        }

                    });
                }

            }

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

    urlForm.$inputEl.on('keyup', urlForm.handleURLInput);

})(window, jQuery);
