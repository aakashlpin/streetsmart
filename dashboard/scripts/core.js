/*globals ohfbObj*/

'use strict';

var ohfbApp = ohfbApp || {};

ohfbApp.Helpers = {};

ohfbApp.Helpers.remote = function(url, payload, callback) {
    //facilitate calling this method without a payload
    if (typeof payload !== 'object') {
        callback = payload;
        payload = {};
    }
    $.getJSON(url, payload).done(callback);
};

ohfbApp.Helpers.capitalize = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

ohfbApp.User = (function(userObj) {
    return function() {
        var userId = userObj.userId,
        userEmailId = userObj.userEmailId;

        return {
            id: userId,
            email: userEmailId
        };
    };
})(ohfbObj);

ohfbApp.Tracks = function() {
    this.user = ohfbApp.User();
    this.get = ohfbApp.Helpers.remote;
    this.capitalize = ohfbApp.Helpers.capitalize;
};

ohfbApp.Tracks.prototype.getTracks = function(callback) {
    var remoteURL = '/api/dashboard/tracks/' + this.user.email;
    this.get(remoteURL, function(response) {
        callback(response);
    });
};

ohfbApp.Tracks.prototype.drawTrackItem = function(seller, trackData) {
    trackData.trackHistoryURL = window.location.origin + '/track/' + seller + '/' + trackData._id;
    trackData.unsubscribeURL = window.location.origin + '/unsubscribe?email='+encodeURIComponent(trackData.email)+'&productURL='+encodeURIComponent(trackData.productURL);
    trackData.affiliateURL = trackData.productURL + '&tag=' + (parseFloat(trackData.currentPrice) > 0 ? 'viglink23182-20' : '100freebooks-20');

    var trackDOM =
    '<tr>'+
        '<td><a target="_blank" href="'+trackData.affiliateURL+'">'+ trackData.productName +'</a></td>'+
        '<td>'+ trackData.currentPrice +'</td>'+
        '<td>'+
            '<a class="btn btn-primary" target="_blank" href="'+trackData.trackHistoryURL+'">View Price History</a>'+
            '<a class="btn btn-primary js-unsubscribe" target="_blank" href="'+trackData.unsubscribeURL+'">Unsubscribe</a>'+
        '</td>'+
    '</tr>'
    ;

    return trackDOM;
};

ohfbApp.Tracks.prototype.drawTrackTable = function(seller, tableBody) {
    var capitalizedSeller = this.capitalize(seller);
    var trackDOMTable =
    '<h4 class="text-center">Trackings @ '+ capitalizedSeller +'</h4>'+
    '<table class="table table-striped" id="dashboardTable">'+
        '<colgroup>'+
            '<col id="db-col1">'+
            '<col id="db-col1">'+
            '<col id="db-col1">'+
        '</colgroup>'+
        '<thead>'+
            '<tr>'+
                '<th>Item</th>'+
                '<th>Current Price (USD)</th>'+
                '<th>Links</th>'+
            '</tr>'+
        '</thead>'+
        '<tbody>'+
        tableBody+
        '</tbody>'+
    '</table>'
    ;

    $('#track-table').html(trackDOMTable);
};

ohfbApp.Tracks.prototype.bindAllEvents = function() {
    $('.js-unsubscribe').on('click', function() {
        $(this).closest('tr').remove();
    });
};
