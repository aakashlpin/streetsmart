'use strict';

(function($, window) {
	var eventBus = window.App.eventBus;
	var EventsHandler = {
		remoteTrackAdd: function (trackPayload) {
			$.getJSON('/queue', trackPayload, function (res) {
				eventBus.emit('track:added', res);
			});
		},
		init: function () {
			eventBus.on('track:add', EventsHandler.remoteTrackAdd);
		}
	};

	EventsHandler.init();

})(jQuery, window);
