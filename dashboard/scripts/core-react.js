'use strict';

var TargetPriceForm = React.createClass({
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
			<form className="form-inline" onSubmit={this.onTargetPriceFormSubmit}>
				<div className="form-group">
					<label className="sr-only">Target Price</label>
					<input className="form-control input-sm css-target-price-input" type="number" required="true" value={this.state.value} onChange={this.handleChange} />
				</div>
			  <button type="submit" className="btn btn-link input-sm"><i className="glyphicon glyphicon-ok-circle"></i> Set</button>
			</form>
		)
	}
});

var EditTargetPriceWrapper = React.createClass({
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
				<TargetPriceForm
				 seller={this.props.seller}
				 _id={this.props._id}
				 targetPrice={this.props.targetPrice}
				 onTargetPriceFormSubmit={this.onTargetPriceFormSubmitHandler} />
			)
		}
		return (
			<div>
				<p>
					<span className="css-target-price-text">{this.props.targetPrice}</span>
					<button className="btn btn-link" onClick={this.onSetMode}><i className="glyphicon glyphicon-edit"></i></button>
					<button className="btn btn-link" onClick={this.onRemoveTargetPrice}><i className="glyphicon glyphicon-remove-circle"></i></button>
				</p>
			</div>
		)
	}
});

var SetTargetPriceWrapper = React.createClass({
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
				<TargetPriceForm
				 seller={this.props.seller}
				 _id={this.props._id}
				 onTargetPriceFormSubmit={this.onTargetPriceFormSubmitHandler} />
			)
		}
		return (
			<div>
				<a onClick={this.onSetMode}><i className="glyphicon glyphicon-bell"></i> Set Target Price</a>
			</div>
		)
	}
});

var ProductItemRow = React.createClass({
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
			targetPriceDom = <EditTargetPriceWrapper
			 seller={this.props.seller}
			 _id={this.props.data._id}
			 targetPrice={this.props.data.targetPrice}
			 onTargetPriceChangeHandler={this.props.onTargetPriceChangeHandler} />

		} else {
			targetPriceDom = <SetTargetPriceWrapper
			 seller={this.props.seller}
			 _id={this.props.data._id}
			 onTargetPriceChangeHandler={this.props.onTargetPriceChangeHandler} />

		}
		return (
			<tr>
				<td>
					<a href={this.props.data.productURL} target="_blank">
						{this.props.data.productName}
					</a>
				</td>
				<td>
					{targetPriceDom}
				</td>
				<td>
					{this.props.data.currentPrice}
				</td>
				<td>
					<ul className="list-inline list-unstyled">
						<li><a className="btn btn-primary" target="_blank" href={trackHistoryURL}>View Price History</a></li>
						<li><a onClick={this.onUnsubscribe} className="btn btn-danger" data-href={unsubscribeURL}>Unsubscribe</a></li>
					</ul>
				</td>
			</tr>
		);
	}
});

var SellerTracksWrapper = React.createClass({
	capitalize: function (string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	},
	render: function () {
		if (!this.props.data.tracks.length) {
			return (<div></div>);
		}

		return (
			<div>
				<h4 className="text-center mb-30 alt-font">
					Price Tracks on {this.capitalize(this.props.data.seller)}
				</h4>
				<table className="table table-striped mb-90">
					<colgroup>
						<col className="db-col1" />
						<col className="db-col2" />
						<col className="db-col3" />
						<col className="db-col4" />
					</colgroup>
					<thead>
						<tr>
							<th>Item</th>
							<th>Target Price (INR)</th>
							<th>Current Price (INR)</th>
							<th>Links</th>
						</tr>
					</thead>
					<tbody>
						{
							this.props.data.tracks.map(function (track) {
								return <ProductItemRow
								 key={track._id}
								 seller={this.props.data.seller}
								 data={track}
								 onUnsubscribeHandler={this.props.onUnsubscribeHandler}
								 onTargetPriceChangeHandler={this.props.onTargetPriceChangeHandler} />

							}.bind(this))
						}
					</tbody>
				</table>
			</div>
		);
	}
});

var Tracks = React.createClass({
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
				<div>
					<h4 className="text-center mb-30">You are not tracking any items yet.</h4>
					<p className="text-center"><a target="_blank" href="//cheapass.in">Begin here</a></p>
				</div>
			)
		}

		return (
			<div>
			{
				this.state.tracks.map(function (sellerTrack) {
					return <SellerTracksWrapper
					 key={sellerTrack.seller}
					 data={sellerTrack}
					 onUnsubscribeHandler={this.onUnsubscribeHandler}
					 onTargetPriceChangeHandler={this.onTargetPriceChangeHandler} />
				}.bind(this))
			}
			</div>
		);
	}
});

React.render(
	<Tracks {...cheapassObj} />,
	document.getElementById('track-table')
);
