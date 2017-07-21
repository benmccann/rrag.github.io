"use strict";

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

import React from "react";
import { extent } from "d3-array";
import { set } from "d3-collection";
import flattenDeep from "lodash.flattendeep";

import Chart from "../Chart";

import { isObject, getClosestItem, zipper, isDefined, isNotDefined, functor } from "./index";

export function getChartOrigin(origin, contextWidth, contextHeight) {
	var originCoordinates = typeof origin === "function" ? origin(contextWidth, contextHeight) : origin;
	return originCoordinates;
}

export function getDimensions(_ref, chartProps) {
	var width = _ref.width,
	    height = _ref.height;


	var chartWidth = chartProps.width || width;
	var chartHeight = chartProps.height || height;

	return {
		availableWidth: width,
		availableHeight: height,
		width: chartWidth,
		height: chartHeight
	};
}

function values(func) {
	return function (d) {
		var obj = func(d);
		return isObject(obj) ? Object.keys(obj).map(function (key) {
			return obj[key];
		}) : obj;
	};
}

export function getNewChartConfig(innerDimension, children) {

	return React.Children.map(children, function (each) {
		if (each.type.toString() === Chart.toString()) {
			var chartProps = _extends({}, Chart.defaultProps, each.props);
			var id = chartProps.id,
			    origin = chartProps.origin,
			    padding = chartProps.padding,
			    yExtentsProp = chartProps.yExtents,
			    yScale = chartProps.yScale,
			    flipYScale = chartProps.flipYScale,
			    yExtentsCalculator = chartProps.yExtentsCalculator;

			var _getDimensions = getDimensions(innerDimension, chartProps),
			    width = _getDimensions.width,
			    height = _getDimensions.height,
			    availableWidth = _getDimensions.availableWidth,
			    availableHeight = _getDimensions.availableHeight;

			var yPan = chartProps.yPan;
			// var { yMousePointerRectWidth: rectWidth, yMousePointerRectHeight: rectHeight, yMousePointerArrowWidth: arrowWidth } = each.props;
			// var mouseCoordinates = { at, yDisplayFormat, rectHeight, rectWidth, arrowWidth };

			var yExtents = isDefined(yExtentsProp) ? (Array.isArray(yExtentsProp) ? yExtentsProp : [yExtentsProp]).map(functor) : undefined;
			// console.log(yExtentsProp, yExtents);
			return {
				id: id,
				origin: functor(origin)(availableWidth, availableHeight),
				padding: padding,
				yExtents: yExtents,
				yExtentsCalculator: yExtentsCalculator,
				flipYScale: flipYScale,
				yScale: yScale,
				yPan: yPan,
				// mouseCoordinates,
				width: width,
				height: height
			};
		}
		return undefined;
	}).filter(function (each) {
		return isDefined(each);
	});
}
export function getCurrentCharts(chartConfig, mouseXY) {
	var currentCharts = chartConfig.filter(function (eachConfig) {
		var top = eachConfig.origin[1];
		var bottom = top + eachConfig.height;
		return mouseXY[1] > top && mouseXY[1] < bottom;
	}).map(function (config) {
		return config.id;
	});

	return currentCharts;
}

function setRange(scale, height, padding, flipYScale) {

	if (scale.rangeRoundPoints || isNotDefined(scale.invert)) {
		if (isNaN(padding)) throw new Error("padding has to be a number for ordinal scale");
		if (scale.rangeRoundPoints) scale.rangeRoundPoints(flipYScale ? [0, height] : [height, 0], padding);
		if (scale.rangeRound) scale.range(flipYScale ? [0, height] : [height, 0]).padding(padding);
	} else {
		var _ref2 = isNaN(padding) ? padding : { top: padding, bottom: padding },
		    top = _ref2.top,
		    bottom = _ref2.bottom;

		scale.range(flipYScale ? [top, height - bottom] : [height - bottom, top]);
	}
	return scale;
}

function yDomainFromYExtents(yExtents, yScale, plotData) {
	var yValues = yExtents.map(function (eachExtent) {
		return plotData.map(values(eachExtent));
	});

	var allYValues = flattenDeep(yValues);

	var realYDomain = yScale.invert ? extent(allYValues) : set(allYValues).values();

	return realYDomain;
}

export function getChartConfigWithUpdatedYScales(chartConfig, _ref3, xDomain, dy, chartsToPan) {
	var plotData = _ref3.plotData,
	    xAccessor = _ref3.xAccessor,
	    displayXAccessor = _ref3.displayXAccessor,
	    fullData = _ref3.fullData;


	var yDomains = chartConfig.map(function (_ref4) {
		var yExtentsCalculator = _ref4.yExtentsCalculator,
		    yExtents = _ref4.yExtents,
		    yScale = _ref4.yScale;


		var realYDomain = isDefined(yExtentsCalculator) ? yExtentsCalculator({ plotData: plotData, xDomain: xDomain, xAccessor: xAccessor, displayXAccessor: displayXAccessor, fullData: fullData }) : yDomainFromYExtents(yExtents, yScale, plotData);

		var yDomainDY = isDefined(dy) ? yScale.range().map(function (each) {
			return each - dy;
		}).map(yScale.invert) : yScale.domain();
		return {
			realYDomain: realYDomain,
			yDomainDY: yDomainDY,
			prevYDomain: yScale.domain()
		};
	});

	var combine = zipper().combine(function (config, _ref5) {
		var realYDomain = _ref5.realYDomain,
		    yDomainDY = _ref5.yDomainDY,
		    prevYDomain = _ref5.prevYDomain;
		var id = config.id,
		    padding = config.padding,
		    height = config.height,
		    yScale = config.yScale,
		    yPan = config.yPan,
		    flipYScale = config.flipYScale,
		    _config$yPanEnabled = config.yPanEnabled,
		    yPanEnabled = _config$yPanEnabled === undefined ? false : _config$yPanEnabled;


		var another = isDefined(chartsToPan) ? chartsToPan.indexOf(id) > -1 : true;
		var domain = yPan && yPanEnabled ? another ? yDomainDY : prevYDomain : realYDomain;
		// console.log(yPan, yPanEnabled, another, domain, realYDomain, prevYDomain);
		return _extends({}, config, {
			yScale: setRange(yScale.copy().domain(domain), height, padding, flipYScale),
			realYDomain: realYDomain
		});
		// return { ...config, yScale: yScale.copy().domain(domain).range([height - padding, padding]) };
	});

	var updatedChartConfig = combine(chartConfig, yDomains);
	return updatedChartConfig;
}

export function getCurrentItem(xScale, xAccessor, mouseXY, plotData) {
	var xValue = void 0,
	    item = void 0;
	if (xScale.invert) {
		xValue = xScale.invert(mouseXY[0]);
		item = getClosestItem(plotData, xValue, xAccessor);
	} else {
		var d = xScale.range().map(function (d, idx) {
			return { x: Math.abs(d - mouseXY[0]), idx: idx };
		}).reduce(function (a, b) {
			return a.x < b.x ? a : b;
		});
		item = isDefined(d) ? plotData[d.idx] : plotData[0];
		// console.log(d, item);
	}
	return item;
}