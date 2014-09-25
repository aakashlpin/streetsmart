/*globals cheapassObj*/

'use strict';

var cheapassApp = cheapassApp || {};

cheapassApp.Helpers = {};

cheapassApp.Helpers.remote = function(url, payload, callback) {
    //facilitate calling this method without a payload
    if (typeof payload !== 'object') {
        callback = payload;
        payload = {};
    }
    $.getJSON(url, payload).done(callback);
};

cheapassApp.Helpers.capitalize = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

cheapassApp.User = (function(userObj) {
    return function() {
        var userId = userObj.userId,
        userEmailId = userObj.userEmailId,
        userDropOnlyAlerts = userObj.dropOnlyAlerts === "true";

        return {
            id: userId,
            email: userEmailId,
            dropOnlyAlerts: userDropOnlyAlerts
        };
    };
})(cheapassObj);

cheapassApp.initializeDOM = function() {
    var user = cheapassApp.User();

    var toggleDropAlertsDOM = $('#toggleDropAlerts');
    toggleDropAlertsDOM.attr('checked', user.dropOnlyAlerts);
    toggleDropAlertsDOM.on('change', function() {
        var dropOnlyAlerts = $(this).is(':checked');
        var remoteURL = '/api/dashboard/preferences/' + user.email;
        var remotePayload = {dropOnlyAlerts: dropOnlyAlerts};
        cheapassApp.Helpers.remote(remoteURL, remotePayload, function(res) {
            console.log(res);
        });
    });
};

cheapassApp.Tracks = function() {
    this.user = cheapassApp.User();
    this.get = cheapassApp.Helpers.remote;
    this.capitalize = cheapassApp.Helpers.capitalize;
};

cheapassApp.Tracks.prototype.getTracks = function(callback) {
    var remoteURL = '/api/dashboard/tracks/' + this.user.email;
    this.get(remoteURL, function(response) {
        callback(response);
    });
};

cheapassApp.Tracks.prototype.drawTrackItem = function(seller, trackData) {
    trackData.trackHistoryURL = window.location.origin + '/track/' + seller + '/' + trackData._id;
    trackData.unsubscribeURL = window.location.origin + '/unsubscribe?email='+encodeURIComponent(trackData.email)+'&productURL='+encodeURIComponent(trackData.productURL);

    var trackDOM =
    '<tr>'+
        '<td><a target="_blank" href="'+trackData.productURL+'">'+ trackData.productName +'</a></td>'+
        '<td>'+ trackData.currentPrice +'</td>'+
        '<td>'+
            '<ul class="list-inline list-unstyled">'+
                '<li><a class="btn btn-primary" target="_blank" href="'+trackData.trackHistoryURL+'">View Price History</a></li>'+
                '<li><a class="btn btn-danger js-unsubscribe" target="_blank" href="'+trackData.unsubscribeURL+'">Unsubscribe</a></li>'+
            '</ul>'+
        '</td>'+
    '</tr>'
    ;

    return trackDOM;
};

cheapassApp.Tracks.prototype.drawTrackTable = function(seller, tableBody) {
    var capitalizedSeller = this.capitalize(seller);
    var trackDOMTable =
    '<h4 class="text-center mb-30 alt-font">Price Tracks on '+ capitalizedSeller +'</h4>'+
    '<table class="table table-striped mb-90" id="dashboardTable">'+
        '<colgroup>'+
            '<col id="db-col1">'+
            '<col id="db-col2">'+
            '<col id="db-col3">'+
        '</colgroup>'+
        '<thead>'+
            '<tr>'+
                '<th>Item</th>'+
                '<th>Current Price (INR)</th>'+
                '<th>Links</th>'+
            '</tr>'+
        '</thead>'+
        '<tbody>'+
        tableBody+
        '</tbody>'+
    '</table>'
    ;

    $('#track-table').append(trackDOMTable);
};

cheapassApp.Tracks.prototype.drawNoTracksDOM = function() {
    var trackDOMTable =
    '<h4 class="text-center mb-30">You are not tracking any items yet.</h4>'+
    '<p class="text-center"><a target="_blank" href="//cheapass.in">Begin here</a></p>';

    $('#track-table').append(trackDOMTable);
};

cheapassApp.Tracks.prototype.bindAllEvents = function() {
    $('.js-unsubscribe').on('click', function() {
        $(this).closest('tr').remove();
    });
};
