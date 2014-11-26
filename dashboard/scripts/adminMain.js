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

    setInterval(function () {
    	Users.getStats(Users.drawStats.bind(Users));
    }, 60000);

    Users.getStats(Users.drawStats.bind(Users));

})(cheapassApp);
