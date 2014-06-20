'use strict';
//the following have to be the collections on the server
//1. verified_emails
//2. queued_requests
// (function($) {
//     //stub out some ajax requests
//     $.mockjax({
//         url: '/inputurl',
//         contentType: 'text/json',
//         responseTime: 750,
//         responseText: {
//             name: 'Apple iPhone 5S',
//             image: 'http://img5a.flixcart.com/image/mobile/z/h/f/apple-iphone-5s-400x400-imadpppc54zfpj9c.jpeg',
//             price: 45940
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
//         responseTime: 750,
//         responseText: {
//             isEmailVerified: false
//         }
//     });
// })(jQuery);


(function(window, $) {
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
                var value = $.trim($(evt.target).val());
                if ((value.indexOf('flipkart.com') > 0) &&
                    (value !== urlForm.oldURL)) {
                    //lets just assume this is a valid url
                    urlForm.oldURL = value;

                    $.getJSON('/inputurl', {url: value}, function(res) {
                        if (!res.price) {
                            //TODO handle error
                            return;
                        }

                        var priceVal = res.price,
                            nameVal = res.name,
                            imageVal = res.image;

                        if ('content' in document.createElement('template')) {
                            //only if the browser supports template tag natively
                            var tmpl = document.querySelector('#tmplNotifyMe');
                            var titleDOM = tmpl.content.querySelector('#product-title');
                            var priceDOM = tmpl.content.querySelector('#product-price');
                            var imageDOM = tmpl.content.querySelector('#product-image');

                            titleDOM.textContent = nameVal;
                            priceDOM.textContent = priceVal;
                            imageDOM.src = imageVal;
                            imageDOM.alt = nameVal;

                            //clone this new template and put it in response container
                            var clone = document.importNode(tmpl.content, true);
                            var responseContainer = document.querySelector('#response-container');
                            responseContainer.appendChild(clone);

                            //bind the event here
                            $(FinalSubmissionForm.el).on('submit', FinalSubmissionForm.handleFormSubmit);

                        } else {
                            //fuck you
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
