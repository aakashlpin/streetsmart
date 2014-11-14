'use strict';
var moment = require('moment');

function Deals(seller, adType) {
	var userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36';
	var viewportSize = '1024x768';
	var pageUrl, selectors, screenshotName;

	if (seller === 'amazon') {
		pageUrl = 'http://www.amazon.in/gp/goldbox/ref=nav_topnav_deals';
		if (adType === 'banner') {
			selectors = [
				{
					fileId: 1,
					cssSelector: '.SINGLE-DEAL-LARGE'		//680x310
				}
			];
		} else if (adType === 'small') {
			selectors = [
				{
					show: '.RIGHT-COL-SDL',	//300x220
				},
				{
					show: '#102_dealView0'	//135x322
				},
				{
					show: '#102_dealView1'
				},
				{
					show: '#102_dealView2'
				},
				{
					show: '#102_dealView3'
				},
				{
					show: '#102_dealView4'
				}
			];
		}
	}

	screenshotName = adType + '_' + seller + '_' + moment().format('YYMMDDHH');

	this.args = [
		'--uri', pageUrl,
		'--user-agent', userAgent,
		'--viewportsize', viewportSize,
		'--output', screenshotName
	];
}

// Deals.prototype.