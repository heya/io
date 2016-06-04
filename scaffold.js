define([], function () {
	'use strict';

	// service scaffolding

	function defaultOptIn (options) {
		return !options.method || options.method.toUpperCase() == 'GET';
	}

	return function (io, name, priority, callback) {
		var service = io[name] = io[name] || {};

		if (!service.theDefault) {
			service.theDefault = defaultOptIn;
		}

		if (!service.attach) {
			service.attach = attach;
		}

		if (!service.optIn) {
			service.optIn = optIn;
		}

		return io;

		function attach () {
			io.attach({
				name:     name,
				priority: priority,
				callback: callback
			});
		}

		function optIn (options) {
			if (name in options) {
				return options[name];
			}
			var optIn = service.theDefault;
			return typeof optIn == 'function' ? optIn(options) : optIn;
		}
	};
});
