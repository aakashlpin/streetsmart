/*globals noty*/

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

cheapassApp.Users.prototype.getAllUsers = function(callback) {
    var remoteURL = '/admin/dashboard/users';
    this.get(remoteURL, callback);
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

cheapassApp.Users.prototype.drawUserItem = function(userData) {
    var userDashboardLink = window.location.origin + '/dashboard?email=' + encodeURIComponent(userData.email);
    var subscription;
    var reminder;
    if (userData.isActive) {
        subscription = {
            text: 'Active',
            class: 'btn-default',
            link: '#',
            attrs: 'disabled="disabled"'
        };
        if (userData.isReminded) {
            reminder = {
                text: 'Reminded',
                class: 'btn-default',
                link: '#',
                attrs: 'disabled="disabled"'
            };
        }
    } else {
        subscription = {
            text: 'Activate',
            class: 'btn-primary',
            link: window.location.origin + '/verify?email=' + encodeURIComponent(userData.email),
            attrs: ''
        };
    }

    if (!userData.isActive) {
        if (userData.isReminded) {
            reminder = {
                text: 'Reminded',
                class: 'btn-default',
                link: '#',
                attrs: 'disabled="disabled"'
            };
        } else {
            reminder = {
                text: 'Send Reminder',
                class: 'btn-success js-xhr',
                link: window.location.origin + '/admin/dashboard/reminder?email=' + encodeURIComponent(userData.email),
                attrs: ''
            };
        }
    }

    var dashboardDOM = userData.isActive ? ('<a target="_blank" href="'+userDashboardLink+'">'+ userData.email +'</a>') : userData.email;
    var reminderDOM = '';
    if (reminder) {
        reminderDOM = '<a '+reminder.attrs+' class="btn '+reminder.class+'" target="_blank" href="'+reminder.link+'">'+reminder.text+'</a>';
    }
    var userDOM =
    '<tr>'+
        '<td>'+ dashboardDOM +'</td>'+
        '<td>'+ userData.currentTracks +'</td>'+
        '<td>'+ userData.since +'</td>'+
        '<td>'+ userData.lifetimeTracks +'</td>'+
        '<td>'+
            '<ul class="list-unstyled list-inline">' +
            '<li><a '+subscription.attrs+' class="btn '+subscription.class+'" target="_blank" href="'+subscription.link+'">'+subscription.text+'</a></li>'+
            '<li>' + reminderDOM + '</li>' +
        '</td>'+
    '</tr>'
    ;

    return userDOM;
};

cheapassApp.Users.prototype.drawUsersTable = function(tableBody) {
    var usersDOMTable =
    '<table class="table table-striped" id="dashboardTable">'+
        '<thead>'+
            '<tr>'+
                '<th>User</th>'+
                '<th>Current Tracks</th>'+
                '<th>Tracking since</th>'+
                '<th>Lifetime Tracks</th>'+
                '<th>Actions</th>'+
            '</tr>'+
        '</thead>'+
        '<tbody>'+
        tableBody+
        '</tbody>'+
    '</table>'
    ;

    $('#users-table')
        .html(usersDOMTable)
        .find('#dashboardTable')
        .dataTable({
            paging: false,
            stateSave: true,
            order: [['2', 'desc']]
        })
    ;
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
