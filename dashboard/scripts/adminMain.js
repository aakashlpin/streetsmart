/*globals cheapassApp*/
'use strict';

(function(cheapassApp) {
    var Users = new cheapassApp.Users();
    Users.getAllUsers(function(users) {
        var usersBody = '';
        users.forEach(function(userItem) {
            usersBody += Users.drawUserItem(userItem);
        });

        Users.drawUsersTable(usersBody);
        Users.bindAllEvents();
    });

})(cheapassApp);
