'use strict';
/* global _ */
(function($, window) {
	var ProductTracks = {
		$el: $('#product-tracks'),
		dataPage: 1,
		isXHRPending: false,
		wookmarkHandler: null,
		tmpl: function (data) {
			var priceTypeClasses = 'frown-o price-higher';
			if (data.currentPrice <= data.ltp) {
				priceTypeClasses = 'smile-o price-lower';
			}
			var addedAt = +new Date();
			return (
				'<li id="'+data._id+'" class="product-track" data-added-at="'+addedAt+'" data-eyes="'+data.eyes+'" data-filter-class=\'["'+data.seller+'"]\'>'+
					'<figure class="effect-zoe">'+
						'<div class="img-container">'+
							'<img class="lazy" data-original="'+data.productImage+'" alt="'+data.productName+'">'+
						'</div>'+
						'<p class="product-name" title="'+data.productName+'">'+data.productName+'</p>'+
						'<figcaption>'+
							'<h2>'+data.seller+'</h2>'+
							'<i class="fa-3x fa fa-'+priceTypeClasses+'"></i>'+
							'<table class="table table-no-border">'+
								'<tr>'+
									'<td>Current Price:</td>'+
									'<td><i class="fa fa-rupee"></i>'+data.currentPrice+'</td>'+
								'</tr>'+
								'<tr>'+
									'<td>Best Tracked Price:</td>'+
									'<td><i class="fa fa-rupee"></i>'+data.ltp+'</td>'+
								'</tr>'+
							'</table>'+
							'<div class="product-actions clearfix">'+
								'<a title="Buy now" target="_blank" href="'+data.productURL+'" class="css-goto-product js-goto-product"><i class="fa fa-3x fa-shopping-cart"></i></a>'+
								'<a title="Add a price track" data-seller="'+data.seller+'" class="css-add-track js-add-track"><i class="fa fa-3x fa-plus"></i></a>'+
							'</div>'+
						'</figcaption>'+
					'</figure>'+
				'</li>'
				);
		},
		handleFilterClick: function (event, filters) {
			var item = $(event.currentTarget),
				activeFilters = [],
				handler = ProductTracks.wookmarkHandler;

			item.toggleClass('active');

			$('html, body').animate({
				scrollTop: $('#product-tracks').offset().top - 60
			}, 2000);

			// Collect active filter strings
			filters.filter('.active').each(function() {
				activeFilters.push($(this).data('filter'));
			});

			handler.wookmarkInstance.filter(activeFilters, 'or');
			handler.wookmarkInstance.layout(true);
		},
		render: function (data) {
			var domStr = '';
			_.each(data, function (productData) {
				domStr += ProductTracks.tmpl(productData);
			});

			ProductTracks.$el.append(domStr);

			// Get a reference to your grid items.
			if (ProductTracks.wookmarkHandler && ProductTracks.wookmarkHandler.wookmarkInstance) {
				ProductTracks.wookmarkHandler.wookmarkInstance.clear();
			}

			var handler = $('#product-tracks > li');

			handler.wookmark({
				container: $('#product-tracks'),
				itemWidth: 225,
				autoResize: true,
				align: 'center',
				offset: 20,
				ignoreInactiveItems: false,
				comparator: function(a, b) {
					var $a = $(a);
					var $b = $(b);
					if (!$a.hasClass('inactive') && !$b.hasClass('inactive')) {
						if ($a.data('eyes') === $b.data('eyes')) {
							return $a.data('added-at') < $b.data('added-at') ? -1 : 1;
						}
						return $a.data('eyes') > $b.data('eyes') ? -1 : 1;
					}
					return $a.hasClass('inactive') && !$b.hasClass('inactive') ? 1 : -1;
				},
				onLayoutChanged: function () {
					ProductTracks
					.$el
					.find('.product-track:not(.inactive)')
						.find('.lazy')
						.trigger('appear');
				}
			});

			ProductTracks.wookmarkHandler = handler;
		},
		lazyLoad: function () {
			var $imgs = ProductTracks.$el.find('.lazy');
			$imgs.lazyload({
				'effect': 'fadeIn',
				'threshold': 100,
				'skip_invisible': false,
				'failure_limit': Math.max($imgs.length-1, 0)
			});
		},
		loadOnScroll: function () {
			var $window = $(window),
			$document = $(document),
			winHeight = window.innerHeight ? window.innerHeight : $window.height(), // iphone fix
			closeToBottom = ($window.scrollTop() + winHeight > $document.height() - 100);
			if (closeToBottom) {
				ProductTracks.loadTracksForPage(ProductTracks.dataPage + 1);
			}
		},
		initiateAddTrack: function (trackPayload) {
			window.App.eventBus.emit('track:add', trackPayload);

		},
		addTrackHandler: function (e) {
			var target = $(e.target);
			var className = 'js-add-track';
			var classNameSelector = '.' + className;

			if (target.is('a') && !target.hasClass(className)) {
				return;
			}
			if (!target.closest(classNameSelector).length) {
				return;
			}

			e.preventDefault();

			var seller = target.data('seller') || target.closest(classNameSelector).data('seller');
			if (!seller) {
				return;
			}

			var email = localStorage.getItem('userEmail');
			if (!email) {
				email = prompt('Email?');
			}

			ProductTracks.initiateAddTrack({
				email: email,
				seller: seller,
				id: target.closest('.product-track').attr('id')
			});
		},
		trackAddedHandler: function (trackRes) {
			var trackId = trackRes.id;
			var trackIdSelector = '#' + trackId;
			var addTrackButtonClass = 'js-add-track';
			var addTrackButtonClassSelector = '.' + addTrackButtonClass;

			$(trackIdSelector)
				.find(addTrackButtonClassSelector)
				.toggleClass('js-add-track active')
				.attr('title', 'Price Track Added')
					.find('.fa-plus')
					.toggleClass('fa-plus fa-check');
		},
		bindAllEvents: function () {
			// Capture scroll for infinite scroll
			$(window).bind('scroll.wookmark', ProductTracks.loadOnScroll);
			// Capture click on copy track to user dashboard button
			ProductTracks.$el.on('click', ProductTracks.addTrackHandler);
			// Handle response from event bus when server responds
			window.App.eventBus.on('track:added', ProductTracks.trackAddedHandler);
		},
		initFilters: function () {
			// Capture filter click events.
			var filters = $('#product-filters > li');
			filters.click(function (e) {
				ProductTracks.handleFilterClick(e, filters);
			});
		},
		toggleLoading: function () {
			$('#loading').toggleClass('hide');
		},
		hideLoading: function () {
			$('#loading').addClass('hide');
		},
		loadTracksForPage: function (page) {
			if (ProductTracks.isXHRPending) {
				return;
			}
			if (ProductTracks.maxPages && (page > ProductTracks.maxPages)) {
				ProductTracks.hideLoading();
				return;
			}

			ProductTracks.toggleLoading();
			ProductTracks.isXHRPending = true;
			$.getJSON('/api/tracks/' + page, function(res) {
				ProductTracks.render(res.data);
				ProductTracks.lazyLoad();
				ProductTracks.dataPage = page;
				ProductTracks.maxPages = res.pages;
				ProductTracks.isXHRPending = false;
				ProductTracks.toggleLoading();
			});
		},
		initSticky: function () {
			$('#sticker').sticky({
				topSpacing:0
			});
		},
		init: function () {
			ProductTracks.loadTracksForPage(1);
			ProductTracks.initFilters();
			ProductTracks.bindAllEvents();
			ProductTracks.initSticky();
		}
	};

	window.App.ProductTracks = ProductTracks;

})(jQuery, window);
