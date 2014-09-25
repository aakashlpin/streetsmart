/*globals cheapassApp*/
'use strict';

(function(cheapassApp) {
    var UserTracks = new cheapassApp.Tracks();
    var totalTracks = 0;
    UserTracks.getTracks(function(tracksBySellers) {
        tracksBySellers.forEach(function(sellerTracks) {
            var seller = sellerTracks.seller,
            tracks = sellerTracks.tracks,
            tracksBody = '';

            totalTracks += tracks.length;

            tracks.forEach(function(trackItem) {
                tracksBody += UserTracks.drawTrackItem(seller, trackItem);
            });

            if (tracks.length) {
                UserTracks.drawTrackTable(seller, tracksBody);
            }
        });

        if (!totalTracks) {
            //user is not tracking anything
            UserTracks.drawNoTracksDOM();
        }

        UserTracks.bindAllEvents();
    });

    cheapassApp.initializeDOM();

})(cheapassApp);
