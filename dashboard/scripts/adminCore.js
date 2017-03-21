/*globals noty, _*/

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

cheapassApp.Users = function() {
    this.get = cheapassApp.Helpers.remote;
    this.statsUserCountDOM = document.querySelector('#ca-counters-users');
    this.statsAlertCountDOM = document.querySelector('#ca-counters-alerts');
    this.statsItemCountDOM = document.querySelector('#ca-counters-products');
};

cheapassApp.Users.prototype.getStats = function (callback) {
    var remoteURL = '/stats';
    this.get(remoteURL, callback);
};

cheapassApp.Users.prototype.drawStats = function (stats) {
    this.statsUserCountDOM.innerHTML = stats.totalUsers;
    this.statsAlertCountDOM.innerHTML = stats.emailsSent;
    this.statsItemCountDOM.innerHTML = stats.itemsTracked;
};

function drawUserItem(userData) {
    var userDashboardLink = window.location.origin + '/dashboard?email=' + encodeURIComponent(userData.email);

    var fc = userData.fullContact || {};

    var fcPrimaryPhoto = _.find(fc.photos, function (photo) {
        return photo.isPrimary;
    });

    var fcPhotoStream = '';

    _.each(fc.photos, function (photo) {
        fcPhotoStream += '<li><img src="'+ photo.url +'" class="css-fc-thumbnail img-rounded"></li>';
    });

    var fcWebsites = '';
    _.each(fc.contactInfo ? fc.contactInfo.websites : [], function (website) {
        fcWebsites += '<li><a target="_blank" href="'+website.url+'">'+ website.url +'</a></li>';
    });

    var fcOrganisations = '';
    _.each(fc.organizations, function (organization) {
        fcOrganisations += '<li><p><strong>'+ (organization.name ? (organization.name + '<br>') : '')  +'</strong>'+ organization.title+'</p></li>';
    });

    var fcSocialProfiles = '';
    _.each(fc.socialProfiles, function (socialProfile) {
        fcSocialProfiles += '<li><p><a target="_blank" href="'+ socialProfile.url+'"><strong>'+socialProfile.typeName+'</strong></a>'+ (socialProfile.bio ? (' - "' +socialProfile.bio + '"') : "") +'</p></li>';
    });

    var userCard =
      '<div class="row">' +
          '<div class="col-md-7">' +
              '<h3><a target="_blank" href="'+ userDashboardLink +'">' + (fc.contactInfo ? fc.contactInfo.fullName : userData.email) + '</a></h3>' +
              '<ul class="list-unstyled">'+
                  fcSocialProfiles +
              '</ul>'+
          '</div>'+
          '<div class="col-md-5">' +
              (fcPrimaryPhoto ? (
              '<div class="mb-30">'+
                  '<img class="js-fcPhoto img-thumbnail" src="'+ fcPrimaryPhoto.url +'">'+
              '</div>'
              ) : '')+
              '<div class="row">'+
                  '<ul class="list-inline list-unstyled">'+
                      fcPhotoStream +
                  '</ul>'+
                  '<ul class="list-unstyled">'+
                      fcOrganisations +
                  '</ul>'+
                  '<ul class="list-unstyled">'+
                      fcWebsites +
                  '</ul>'+
              '</div>'+
          '</div>'+
      '</div>'
    ;

    return userCard;
};

cheapassApp.Users.prototype.drawUsersTable = function() {
    var dt = $('#dashboardTable')
        .DataTable({
          processing: true,
          ajax: '/admin/dashboard/users',
          pagingType: 'simple_numbers',
          serverSide: true,
          columns: [
            { data: 'email' },
            { data: 'activeAlerts' },
            { data: 'signedUpAt' }
          ],
        });

    // Array to track the ids of the details displayed rows
    var detailRows = [];

    $('#dashboardTable tbody').on( 'click', 'tr', function () {
        var tr = $(this);
        var row = dt.row( tr );
        var idx = $.inArray( tr.attr('id'), detailRows );

        if ( row.child.isShown() ) {
            tr.removeClass( 'details' );
            row.child.hide();

            // Remove from the 'open' array
            detailRows.splice( idx, 1 );
        }
        else {
            tr.addClass( 'details' );
            row.child( drawUserItem( row.data() ) ).show();

            // Add to the 'open' array
            if ( idx === -1 ) {
                detailRows.push( tr.attr('id') );
            }
        }
    } );

    // On each draw, loop over the `detailRows` array and show any child rows
    dt.on( 'draw', function () {
        $.each( detailRows, function ( i, id ) {
            $('#'+id+' td.details-control').trigger( 'click' );
        } );
    } );
};

cheapassApp.Users.prototype.bindAllEvents = function() {
    $('.js-xhr').on('click', function(e) {
        e.preventDefault();
        var target = $(e.target);
        var link = target.attr('href');
        $.getJSON(link, function (res) {
            if (res.error) {
                noty({
                    text: res.error,
                    type: 'error'
                });
            } else {
                target.attr('disabled', 'disabled');
            }
        });
    });
};
