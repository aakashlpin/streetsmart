'use strict';
/**
 * modalEffects.js v1.0.0
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright 2013, Codrops
 * http://www.codrops.com
 */
(function($) {

	function init() {

		var overlay = document.querySelector( '.md-overlay' );

		[].slice.call( document.querySelectorAll( '.md-trigger' ) ).forEach( function( el ) {

			var modal = document.querySelector( '#' + el.getAttribute( 'data-modal' ) ),
				close = modal.querySelector( '.md-close' );

			function removeModal() {
				$(modal).removeClass( 'md-show' );
			}

			function showModal ( modalId ) {
				//for the click event, it won't be a string
				if (_.isString(modalId)) {
					if (modalId) {
						modalId = '#' + modalId;
					} else {
						modalId = modal;
					}
				} else {
					modalId = '#' + $(modal).attr('id');
				}
				$(modalId).addClass('md-show').find('.js-modal-input').focus();
				overlay.removeEventListener( 'click', removeModal );
				overlay.addEventListener( 'click', removeModal );

				//emit event in case someone wants to listen
				window.App.eventBus.emit('modal:shown', modalId);
			}

			el.addEventListener( 'click', showModal );

			close.addEventListener( 'click', function( ev ) {
				ev.stopPropagation();
				removeModal();
			});

			window.App.eventBus.on( 'modal:show',  showModal );
			window.App.eventBus.on( 'modal:close', removeModal );
		} );
	}

	init();

})(jQuery, window);