'use strict';

(function($, window) {
	var EventBus = new EventEmitter2();
	window.App.eventBus = EventBus;

})(jQuery, window);