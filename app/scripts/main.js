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

/* POLYFILL */
(function templatePolyfill(d) {
    if('content' in d.createElement('template')) {
        return false;
    }

    var qPlates = d.getElementsByTagName('template'),
        plateLen = qPlates.length,
        elPlate,
        qContent,
        contentLen,
        docContent;

    for(var x=0; x<plateLen; ++x) {
        elPlate = qPlates[x];
        qContent = elPlate.childNodes;
        contentLen = qContent.length;
        docContent = d.createDocumentFragment();

        while(qContent[0]) {
            docContent.appendChild(qContent[0]);
        }

        elPlate.content = docContent;
    }
})(document);

(function(window, $) {
    window.odometerOptions = {
      auto: true, // Don't automatically initialize everything with class 'odometer'
      selector: '#ca-counters-emails', // Change the selector used to automatically find things to be animated
      format: '(,ddd).dd', // Change how digit groups are formatted, and how many digits are shown after the decimal point
      // duration: 1000, // Change how long the javascript expects the CSS animation to take
      // theme: 'car', // Specify the theme (if you have more than one theme css file on the page)
      animation: 'count' // Count is a simpler animation method which just increments the value,
                         // use it when you're looking for something more subtle.
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

    var Counters = {
        // $usersCount: $('#ca-counters-users'),
        // $itemsCount: $('#ca-counters-products'),
        $emailsCount: $('#ca-counters-emails'),
        init: function() {
            $.getJSON('/stats', function(res) {
                // Counters.$usersCount.html(res.totalUsers);
                // Counters.$itemsCount.html(res.itemsTracked);
                Counters.$emailsCount.html(res.emailsSent);
            });
        }
    };

    var LandingBackground = {
        $el: $('.landing-image'),
        imgSrc: '../img/cover3.jpg',
        init: function (argument) {
            var bgImg = new Image();
            bgImg.onload = function(){
               LandingBackground.$el.css({
                    'background-image': 'url(' + bgImg.src + ')'
               })
               .addClass('animated fadeIn');
            };
            bgImg.src = LandingBackground.imgSrc;
        }
    };

    var ProductTracks = {
        $el: $('#product-tracks'),
        data: [
            {
                productName: 'Moto X (16 GB)',
                productImage: 'http://img5a.flixcart.com/image/mobile/m/t/n/motorola-moto-x-400x400-imadu82xgcr8abck.jpeg',
                productPrice: 23999,
                productPriceHistory: [],
                eyes: 8
            },
            {
                productName: 'Carry on Bags Stop Scanning Ma Tote',
                productImage: 'http://img6a.flixcart.com/image/hand-messenger-bag/f/k/g/cob-1648-carry-on-bags-tote-stop-scanning-ma-400x400-imadwkprhxtuvztv.jpeg',
                productPrice: 549,
                productPriceHistory: [],
                eyes: 12
            },
            {
                productName: 'Puma Strike Ind. Running Shoes',
                productImage: 'http://img5a.flixcart.com/image/shoe/4/a/x/01-black-white-188016-puma-10-400x400-imadzek2j34xz6vr.jpeg',
                productPrice: 1999,
                productPriceHistory: [],
                eyes: 2
            },
            {
                productName: 'Stanley 72-118-IN Hand Tool Kit',
                productImage: 'http://img6a.flixcart.com/image/power-hand-tool-kit/4/a/h/72-118-in-stanley-400x400-imadu93cgqwbdggy.jpeg',
                productPrice: 1595,
                productPriceHistory: [],
                eyes: 1
            }
        ],
        tmpl: function (data) {
            return (
                '<li class="product-track">'+
                    '<div class="img-container">'+
                        '<img src="'+data.productImage+'" alt="'+data.productName+'">'+
                    '</div>'+
                    '<p class="product-name" title="'+data.productName+'">'+data.productName+'</p>'+
                '</li>'
                );
        },
        render: function (data) {
            var domStr = '';
            _.each(data, function (productData) {
                domStr += ProductTracks.tmpl(productData);
            });

            ProductTracks.$el.html(domStr);

            $('.product-tracks > li').wookmark({
                container: $('.product-tracks'),
                itemWidth: 225,
                autoResize: true,
                align: "center",
                offset: 20
            });
        },
        init: function () {
            if (window.location.origin.indexOf('localhost') >= 0) {
                ProductTracks.render(ProductTracks.data);
            } else {
                $.getJSON('/api/tracks', function(data) {
                    ProductTracks.render(data);
                });
            }
        }
    };

    urlForm.$el.on('submit', urlForm.handleURLInputPaste);
    urlForm.$inputEl.on('paste', urlForm.handleURLInputPaste);
    urlForm.$inputEl.on('click', urlForm.handleURLInputClick);

    setInterval(function() {
        Counters.init();
    }, 10000);

    Counters.init();
    LandingBackground.init();
    ProductTracks.init();

})(window, jQuery);
