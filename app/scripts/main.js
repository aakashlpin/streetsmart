'use strict';
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
            $.getJSON('/queue', $(this).serialize(), function(res) {
                console.log(res);
                if (res.isEmailVerified) {
                    //good! success message
                } else {
                    //notify to get his email verified
                }
            });
        }
    };

    urlForm.$inputEl.on('keyup', urlForm.handleURLInput);

})(window, jQuery);
