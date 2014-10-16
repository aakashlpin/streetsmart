'use strict';
/* global _ */
(function($, window) {
	var ProductTracks = {
		$el: $('#product-tracks'),
		dataPage: 1,
		tmpl: function (data) {
			var priceTypeClasses = 'frown-o price-higher';
			if (data.currentPrice <= data.ltp) {
				priceTypeClasses = 'smile-o price-lower';
			}
			return (
				'<li id="'+data._id+'" class="product-track" data-eyes="'+data.eyes+'" data-filter-class=\'["'+data.seller+'"]\'>'+
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
									'<td>Best known Price:</td>'+
									'<td><i class="fa fa-rupee"></i>'+data.ltp+'</td>'+
								'</tr>'+
							'</table>'+
							'<div class="product-actions clearfix">'+
								'<a title="Buy now" target="_blank" href="'+data.productURL+'" class="js-goto-product"><i class="fa fa-3x fa-shopping-cart"></i></a>'+
								'<a title="Add a price track" class="js-add-track"><i class="fa fa-3x fa-eye"></i></a>'+
							'</div>'+
						'</figcaption>'+
					'</figure>'+
				'</li>'
				);
		},
		render: function (data) {
			var domStr = '';
			_.each(data, function (productData) {
				domStr += ProductTracks.tmpl(productData);
			});

			ProductTracks.$el.html(domStr);

			// Get a reference to your grid items.
			var handler = $('#product-tracks > li'),
				filters = $('#product-filters > li');

			handler.wookmark({
				container: $('#product-tracks'),
				itemWidth: 225,
				autoResize: true,
				align: 'center',
				offset: 20,
				ignoreInactiveItems: false,
				comparator: function(a, b) {
					if (!$(a).hasClass('inactive') && !$(b).hasClass('inactive')) {
						return $(a).data('eyes') > $(b).data('eyes') ? -1 : 1;
					}
					return $(a).hasClass('inactive') && !$(b).hasClass('inactive') ? 1 : -1;
				},
				onLayoutChanged: function () {
					ProductTracks
					.$el
					.find('.product-track:not(.inactive)')
						.find('.lazy')
						.trigger('appear');
				}
			});

			/**
			 * When a filter is clicked, toggle it's active state and refresh.
			 */
			var onClickFilter = function(event) {
				var item = $(event.currentTarget),
					activeFilters = [];

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
			};

			// Capture filter click events.
			filters.click(onClickFilter);
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
			/**
			 * When scrolled all the way to the bottom, add more tiles
			 */
			  // Check if we're within 100 pixels of the bottom edge of the broser window.
			var  $window = $(window),
			  $document = $(document);
			var winHeight = window.innerHeight ? window.innerHeight : $window.height(), // iphone fix
			closeToBottom = ($window.scrollTop() + winHeight > $document.height() - 100);

			if (closeToBottom) {
				// Get the first then items from the grid, clone them, and add them to the bottom of the grid
				// var $items = $('li', $tiles),
				// $firstTen = $items.slice(0, 10);
				// $tiles.append($firstTen.clone());

				// applyLayout();
			}
		},
		bindAllEvents: function () {
			ProductTracks.loadOnScroll();
		},
		init: function () {
			$.getJSON('/api/tracks/1', function(data) {
				ProductTracks.render(data);
				ProductTracks.lazyLoad();
			});

			$('#sticker').sticky({topSpacing:0});
		}
	};

	window.App.ProductTracks = ProductTracks;

})(jQuery, window);
