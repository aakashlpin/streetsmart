/*jshint quotmark: false */
/*jslint latedef:false*/
'use strict';
(function(){
    // the minimum version of jQuery we want
    var v = '1.11.1';
    function isCurrentjQueryOlderThan(required) {
        var current = window.jQuery.fn.jquery;
        var currentSplit = current.split('.').map(function(ele) {return parseInt(ele);});
        var requiredSplit = required.split('.').map(function(ele) {return parseInt(ele);});
        if (currentSplit[0] === requiredSplit[0]) {
            //1.1.11 1.7.4
            if (currentSplit[1] === requiredSplit[1]) {
                //1.11.1 1.11.0
                if (currentSplit[2] === requiredSplit[2]) {
                    //1.11.1 1.11.1
                    return true;
                } else {
                    return currentSplit[2] < requiredSplit[2];
                }
            } else {
                return currentSplit[1] < requiredSplit[1];
            }
        } else {
            return currentSplit[0] < requiredSplit[0];
        }
    }

    // check prior inclusion and version
    if (window.cheapass === undefined && (window.jQuery === undefined || isCurrentjQueryOlderThan(v))) {
        var done = false;
        var script = document.createElement('script');
        script.src = 'https://ajax.googleapis.com/ajax/libs/jquery/' + v + '/jquery.min.js';
        script.onload = script.onreadystatechange = function(){
            if (!done && (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete')) {
                done = true;
                initCheapass();
            }
        };
        document.getElementsByTagName('head')[0].appendChild(script);
    } else {
        initCheapass();
    }

    function initCheapass() {
        function cssIsFetched(cssRes) {
            if (cssRes) {
                //Check if the user theme element is in place - if not, create it.
                if (!$('#cheapassCSS').length) {
                    $('head').append('<style id="cheapassCSS"></style>');
                }

                //populate the theme element with the new style (replace the old one if necessary)
                $('#cheapassCSS').text(cssRes);
            }

            window.cheapass = function() {
                var caPopup = '#caPopup';

                var domTop =
                  '<div id="caPopup">' +
                    '<a id="caClose" class="caClose" title="Close" style="position: absolute; left: -10px; top: -10px;"><div class="circle" style="font-size: 17px; border: 2px solid #444546; padding: 0 0 0 0; width: 26px; height: 26px; background-color:#444546; color: #fff; border-radius: 50px; text-align: center;"> x </div></a>' +
                    '<a target="_blank" href="https://cheapass.in"><img class="caPopupLogo" src="https://cheapass.in/cdn/cheapass.png" /></a>';

                var domFinePrintSeller =
                  '<p class="caFinePrint">Get notified when the prices drop</p>';

                var domFinePrintSite =
                  '<p class="caFinePrint">A Cheapass doesn\'t pay for stuff.</p>';

                var domBottom =
                  '</div>';

                var url = document.location.href;

                //remove the popup if exists
                function removePopup() {
                    if ($(caPopup).length) {
                        $(caPopup).remove();
                    }
                }

                removePopup();

                function showEmailInputToQueueProduct() {
                    var dom =
                      domTop +
                      domFinePrintSeller +
                      '<form id="caQueueForm" class="caQueueForm">' +
                        '<input type="hidden" name="url" value="' + url + '" />' +
                        '<input type="hidden" name="source" value="bookmarklet" />' +
                        '<input type="hidden" name="jsonp" value="1" />' +
                        '<div class="caFormGroup">' +
                          '<label for="caFormUserEmail">Email</label>' +
                          '<input required autofocus type="email" class="email" name="email" placeholder="Email" />' +
                        '</div>' +
                        '<div class="caFormGroup">' +
                          '<input type="submit" value="Set Alert" />' +
                        '</div>' +
                      '</form>'+
                      '<p style="font-size: 12px; color: #ababab; font-style: italic;">By clicking "Set Alert", you allow us to send price drop alerts on this email id.</p>'+
                      '<p style="font-size: 12px; color: #ababab; font-style: italic;">You\'ll receive an email to verify your email id if you are a new user.</p>'+
                      '<p></p>'+
                    domBottom;

                    $('body').append(dom);

                    if ('localStorage' in window) {
                        var userEmail = localStorage.getItem('cheapassUserEmail');
                        if (userEmail) {
                            $('#caQueueForm').find('.email').val(userEmail).focus();
                        }
                    }

                    $('#caQueueForm').on('submit', handleQueueFormSubmit);
                    $('#caClose').on('click', function () {
                      removePopup();
                    });
                }

                function handleQueueFormSubmit(e) {
                    e.preventDefault();
                    var payload = $(this).serialize();
                    $.ajax({
                        url: 'https://cheapass.in/queue?' + payload,
                        dataType: 'jsonp',
                        success: queueResponseHandler,
                    });

                    if ('localStorage' in window) {
                        var email = $('#caQueueForm').find('.email').val();
                        localStorage.setItem('cheapassUserEmail', email);
                    }

                    $('#caQueueForm input').attr('disabled', 'disabled');
                }

                function queueResponseHandler(res) {
                    var isError = res.error;
                    var classname = isError ? 'caTextError' : 'caTextSuccess';
                    var message = isError ? res.error : res.status;

                    var messageDOM = '<p class="'+ classname +'">' + message + '</p>'

                    $('#caQueueForm')
                    .find('.caTextError')
                    .remove();

                    if (isError) {
                      $('#caQueueForm')
                      .append(messageDOM);

                      $('#caQueueForm input').removeAttr('disabled');

                    } else {
                      $('#caQueueForm')
                      .find('input[type="submit"]')
                      .remove()
                      .end()
                      .append(
                        messageDOM
                      )
                    }

                }

                showEmailInputToQueueProduct();
            };

            window.cheapass();

        }

        if (window.cheapass) {
            cssIsFetched();
        } else {
            $.ajax({
                url: 'https://cheapass.in/cdn/cheapass.css?ts=' + new Date().getTime(),
                type: 'get',
                crossDomain: true,
                success: cssIsFetched
            });
        }
    }
})();
