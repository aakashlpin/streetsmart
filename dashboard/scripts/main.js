/*globals ohfbApp*/
'use strict';

(function(ohfbApp) {
    var UserTracks = new ohfbApp.Tracks();
    UserTracks.getTracks(function(tracksBySellers) {
        tracksBySellers.forEach(function(sellerTracks) {
            var seller = sellerTracks.seller,
            tracks = sellerTracks.tracks,
            tracksBody = '';

            tracks.forEach(function(trackItem) {
                tracksBody += UserTracks.drawTrackItem(seller, trackItem);
            });

            UserTracks.drawTrackTable(seller, tracksBody);
        });

        UserTracks.bindAllEvents();
    });

})(ohfbApp);
