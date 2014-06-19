(function($) {
    //stub out some ajax requests
    $.mockjax({
        url: '/inputurl',
        contentType: 'text/json',
        responseTime: 750,
        responseText: {
            price: 44899
        }
    })
})(jQuery);


;(function(window, $) {
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
                if ((value.indexOf('flipkart.com') > 0)
                && (value !== urlForm.oldURL)) {
                    //lets just assume this is a valid url
                    urlForm.oldURL = value;

                    $.getJSON('/inputurl', {url: value}, function(res) {
                        if (!res.price) {
                            //TODO handle error
                            return;
                        }
                        var price = res.price;
                        
                    });
                }

            }

        },
        handleFormSubmit: function() {

        }
    };

    urlForm.$el.on('submit', urlForm.handleFormSubmit);
    urlForm.$inputEl.on('keyup', urlForm.handleURLInput);

})(window, jQuery);
