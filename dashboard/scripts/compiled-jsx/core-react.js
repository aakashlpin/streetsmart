'use strict';

var TargetPriceForm = React.createClass({displayName: "TargetPriceForm",
	getInitialState: function () {
		return {
			value: ''
		}
	},
	componentDidMount: function () {
		this.setState({
			value: this.props.targetPrice
		});
	},
	onTargetPriceFormSubmit: function (e) {
		e.preventDefault();
		var $form = $(e.target);
		var $targetPriceInput = $form.find('input');
		var targetPriceVal = $targetPriceInput.val();
		if (parseInt(targetPriceVal) > 0) {
			//sync with server
			$.getJSON('/api/dashboard/targetPrice', {
				seller: this.props.seller,
				_id: this.props._id,
				targetPrice: targetPriceVal
			});

			this.props.onTargetPriceFormSubmit(this.props.seller, this.props._id, targetPriceVal);
		}
	},
	handleChange: function (e) {
		this.setState({
			value: e.target.value
		});
	},
	render: function () {
		return (
			React.createElement("form", {className: "form-inline", onSubmit: this.onTargetPriceFormSubmit}, 
				React.createElement("div", {className: "form-group"}, 
					React.createElement("label", {className: "sr-only"}, "Target Price"), 
					React.createElement("input", {className: "form-control input-sm css-target-price-input", type: "number", required: "true", value: this.state.value, onChange: this.handleChange})
				), 
			  React.createElement("button", {type: "submit", className: "btn btn-link input-sm"}, React.createElement("i", {className: "glyphicon glyphicon-ok-circle"}), " Set")
			)
		)
	}
});

var EditTargetPriceWrapper = React.createClass({displayName: "EditTargetPriceWrapper",
	getInitialState: function () {
		return {
			editMode: 0
		}
	},
	onSetMode: function (e) {
		e.preventDefault();
		this.setState({
			editMode: 1
		});
	},
	onTargetPriceFormSubmitHandler: function (seller, _id, targetPrice) {
		this.setState({
			editMode: 0
		});
		this.props.onTargetPriceChangeHandler(seller, _id, targetPrice);
	},
	onRemoveTargetPrice: function () {
		$.getJSON('/api/dashboard/targetPrice', {
			seller: this.props.seller,
			_id: this.props._id,
			targetPrice: -1
		});

		this.props.onTargetPriceChangeHandler(this.props.seller, this.props._id);
	},
	render: function () {
		if (this.state.editMode) {
			return (
				React.createElement(TargetPriceForm, {
				 seller: this.props.seller, 
				 _id: this.props._id, 
				 targetPrice: this.props.targetPrice, 
				 onTargetPriceFormSubmit: this.onTargetPriceFormSubmitHandler})
			)
		}
		return (
			React.createElement("div", null, 
				React.createElement("p", null, 
					React.createElement("span", {className: "css-target-price-text"}, this.props.targetPrice), 
					React.createElement("button", {className: "btn btn-link", onClick: this.onSetMode}, React.createElement("i", {className: "glyphicon glyphicon-edit"})), 
					React.createElement("button", {className: "btn btn-link", onClick: this.onRemoveTargetPrice}, React.createElement("i", {className: "glyphicon glyphicon-remove-circle"}))
				)
			)
		)
	}
});

var SetTargetPriceWrapper = React.createClass({displayName: "SetTargetPriceWrapper",
	getInitialState: function () {
		return {
			editMode: 0
		}
	},
	onSetMode: function (e) {
		e.preventDefault();
		this.setState({
			editMode: 1
		});
	},
	onTargetPriceFormSubmitHandler: function (seller, _id, targetPrice) {
		this.setState({
			editMode: 0
		});
		this.props.onTargetPriceChangeHandler(seller, _id, targetPrice);
	},
	render: function () {
		if (this.state.editMode) {
			return (
				React.createElement(TargetPriceForm, {
				 seller: this.props.seller, 
				 _id: this.props._id, 
				 onTargetPriceFormSubmit: this.onTargetPriceFormSubmitHandler})
			)
		}
		return (
			React.createElement("div", null, 
				React.createElement("a", {onClick: this.onSetMode}, React.createElement("i", {className: "glyphicon glyphicon-bell"}), " Set Target Price")
			)
		)
	}
});

var ProductItemRow = React.createClass({displayName: "ProductItemRow",
	onUnsubscribe: function (e) {
		e.preventDefault();
		var $target = $(e.target);
		var href = $target.data('href');
		//disable the button
		$target.attr('disabled', 'disabled');
		//send a ajax request to unsubscribe
		$.getJSON(href, function (response) {
			if (response.status && response.status === 'ok') {
				this.props.onUnsubscribeHandler(this.props.seller, this.props.data._id);
			}
		}.bind(this));
	},
	render: function () {
		var trackHistoryURL = window.location.origin + '/track/' + this.props.seller + '/' + this.props.data._id;
		var unsubscribeURL = window.location.origin + '/unsubscribe?email='+encodeURIComponent(this.props.data.email)+'&productURL='+encodeURIComponent(this.props.data.productURL);

		var targetPriceDom;
		if (this.props.data.targetPrice) {
			targetPriceDom = React.createElement(EditTargetPriceWrapper, {
			 seller: this.props.seller, 
			 _id: this.props.data._id, 
			 targetPrice: this.props.data.targetPrice, 
			 onTargetPriceChangeHandler: this.props.onTargetPriceChangeHandler})

		} else {
			targetPriceDom = React.createElement(SetTargetPriceWrapper, {
			 seller: this.props.seller, 
			 _id: this.props.data._id, 
			 onTargetPriceChangeHandler: this.props.onTargetPriceChangeHandler})

		}
		return (
			React.createElement("tr", null, 
				React.createElement("td", null, 
					React.createElement("a", {href: this.props.data.productURL, target: "_blank"}, 
						this.props.data.productName
					)
				), 
				React.createElement("td", null, 
					targetPriceDom
				), 
				React.createElement("td", null, 
					this.props.data.currentPrice
				), 
				React.createElement("td", null, 
					React.createElement("ul", {className: "list-inline list-unstyled"}, 
						React.createElement("li", null, React.createElement("a", {className: "btn btn-primary", target: "_blank", href: trackHistoryURL}, "View Price History")), 
						React.createElement("li", null, React.createElement("a", {onClick: this.onUnsubscribe, className: "btn btn-danger", "data-href": unsubscribeURL}, "Unsubscribe"))
					)
				)
			)
		);
	}
});

var SellerTracksWrapper = React.createClass({displayName: "SellerTracksWrapper",
	capitalize: function (string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	},
	render: function () {
		if (!this.props.data.tracks.length) {
			return (React.createElement("div", null));
		}

		return (
			React.createElement("div", null, 
				React.createElement("h4", {className: "text-center mb-30 alt-font"}, 
					"Price Tracks on ", this.capitalize(this.props.data.seller)
				), 
				React.createElement("table", {className: "table table-striped mb-90"}, 
					React.createElement("colgroup", null, 
						React.createElement("col", {className: "db-col1"}), 
						React.createElement("col", {className: "db-col2"}), 
						React.createElement("col", {className: "db-col3"}), 
						React.createElement("col", {className: "db-col4"})
					), 
					React.createElement("thead", null, 
						React.createElement("tr", null, 
							React.createElement("th", null, "Item"), 
							React.createElement("th", null, "Target Price (INR)"), 
							React.createElement("th", null, "Current Price (INR)"), 
							React.createElement("th", null, "Links")
						)
					), 
					React.createElement("tbody", null, 
						
							this.props.data.tracks.map(function (track) {
								return React.createElement(ProductItemRow, {
								 key: track._id, 
								 seller: this.props.data.seller, 
								 data: track, 
								 onUnsubscribeHandler: this.props.onUnsubscribeHandler, 
								 onTargetPriceChangeHandler: this.props.onTargetPriceChangeHandler})

							}.bind(this))
						
					)
				)
			)
		);
	}
});

var Tracks = React.createClass({displayName: "Tracks",
	getInitialState: function () {
		return {
			tracks: []
		};
	},
	componentDidMount: function () {
		var remoteURL = '/api/dashboard/tracks/' + this.props.email;
		$.get(remoteURL, function(response) {
			if (this.isMounted()) {
				this.setState({
					tracks: response
				});
			}
		}.bind(this));
	},
	onUnsubscribeHandler: function (seller, _id) {
		var tracks = _.map(this.state.tracks, function (sellerTracks) {
			if (sellerTracks.seller !== seller) {
				return sellerTracks;
			}

			sellerTracks.tracks = _.reject(sellerTracks.tracks, function (sellerTrack) {
				return (sellerTrack._id === _id);
			});

			return sellerTracks;
		});

		this.setState({
			tracks: tracks
		});
	},
	onTargetPriceChangeHandler: function (seller, _id, targetPrice) {
		var tracks = _.map(this.state.tracks, function (sellerTracks) {
			if (sellerTracks.seller !== seller) {
				return sellerTracks;
			}

			sellerTracks.tracks = _.map(sellerTracks.tracks, function (sellerTrack) {
				if (sellerTrack._id !== _id) {
					return sellerTrack;
				}
				if (targetPrice) {
					sellerTrack.targetPrice = targetPrice;
				} else {
					delete sellerTrack.targetPrice;
				}
				return sellerTrack;
			});

			return sellerTracks;
		});

		this.setState({
			tracks: tracks
		});
	},
	render: function () {
		var totalTracks = 0;
		this.state.tracks.forEach(function(sellerTracks) {
			totalTracks += sellerTracks.tracks.length;
		});

		if (!totalTracks) {
			return (
				React.createElement("div", null, 
					React.createElement("h4", {className: "text-center mb-30"}, "You are not tracking any items yet."), 
					React.createElement("p", {className: "text-center"}, React.createElement("a", {target: "_blank", href: "//cheapass.in"}, "Begin here"))
				)
			)
		}

		return (
			React.createElement("div", null, 
			
				this.state.tracks.map(function (sellerTrack) {
					return React.createElement(SellerTracksWrapper, {
					 key: sellerTrack.seller, 
					 data: sellerTrack, 
					 onUnsubscribeHandler: this.onUnsubscribeHandler, 
					 onTargetPriceChangeHandler: this.onTargetPriceChangeHandler})
				}.bind(this))
			
			)
		);
	}
});

React.render(
	React.createElement(Tracks, React.__spread({},  cheapassObj)),
	document.getElementById('track-table')
);
