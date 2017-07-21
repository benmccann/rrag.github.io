"use strict";

import { rebind } from "d3fc-rebind";

import { merge } from "../utils";
import { atr } from "../calculator";

import baseIndicator from "./baseIndicator";

var ALGORITHM_TYPE = "ATR";

export default function () {

	var base = baseIndicator().type(ALGORITHM_TYPE);

	var underlyingAlgorithm = atr();

	var mergedAlgorithm = merge().algorithm(underlyingAlgorithm).merge(function (datum, indicator) {
		datum.atr = indicator;
	});

	var indicator = function indicator(data) {
		var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { merge: true };

		if (options.merge) {
			if (!base.accessor()) throw new Error("Set an accessor to " + ALGORITHM_TYPE + " before calculating");
			return mergedAlgorithm(data);
		}
		return underlyingAlgorithm(data);
	};

	rebind(indicator, base, "id", "accessor", "stroke", "fill", "echo", "type");
	rebind(indicator, underlyingAlgorithm, "options");
	rebind(indicator, mergedAlgorithm, "merge", "skipUndefined");

	return indicator;
}