'use strict';

(function($) {
    var form = $('#formGetDashboard');
    form.on('submit', function(e) {
        e.preventDefault();
        var $this = $(this);
        var inputBox = $this.find('input[type="email"]');
        var inputEmail = $.trim(inputBox.val());
        inputBox.attr('disabled', 'disabled');
        $.getJSON('/api/dashboard/sendDashboardLink', {email: inputEmail}, function(res) {
            var responseContainer = $('#response-container');
            if (res.error) {
                responseContainer.find('p').toggleClass('text-danger text-success').html(res.error);
                inputBox.removeAttr('disabled');
            }
            responseContainer.removeClass('hide');
        });
    });
})(jQuery);
