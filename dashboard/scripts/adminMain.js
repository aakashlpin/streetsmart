/*globals cheapassApp*/
'use strict';

(function(cheapassApp) {
    var Users = new cheapassApp.Users();
    Users.drawUsersTable();
    Users.bindAllEvents();

    setInterval(function () {
    	Users.getStats(Users.drawStats.bind(Users));
    }, 60000);

    Users.getStats(Users.drawStats.bind(Users));

})(cheapassApp);
