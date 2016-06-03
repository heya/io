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

		service.attach = attach;
		service.optIn  = optIn;

		return io;

		function attach () {
			io.addService({
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
