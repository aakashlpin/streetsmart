'use strict';
/* globals _ */
/* globals Highcharts */

var hcPriceData = [];
var caObj = caObj || {};
_.each(caObj.priceHistory, function(priceHistoryItem) {
	var index0 = +new Date(priceHistoryItem.date);
	var index1 = priceHistoryItem.price;
	hcPriceData.push([index0, index1]);
});

$('#prettyGraphContainer').highcharts({
    chart: {
        zoomType: 'x'
    },
    title: {
        text: caObj.productName,
    },
    xAxis: {
        type: 'datetime'
    },
    yAxis: {
        title: {
            text: 'Price (₹)'
        }
    },
    legend: {
        enabled: false
    },
    plotOptions: {
        area: {
            fillColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1},
                stops: [
                    [0, Highcharts.getOptions().colors[0]],
                    [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                ]
            },
            marker: {
                radius: 2
            },
            lineWidth: 1,
            states: {
                hover: {
                    lineWidth: 1
                }
            },
            threshold: null
        }
    },

    series: [{
        type: 'area',
        name: 'Price',
        data: hcPriceData
    }]
});
