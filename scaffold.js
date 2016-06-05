define([], function () {
	'use strict';

	// service scaffolding

	function defaultOptIn (options) {
		return !options.method || options.method.toUpperCase() == 'GET';
	}

	var names = ['theDefault', 'attach', 'detach', 'optIn'];

	return function (io, name, priority, callback) {
		var service = io[name] = io[name] || {};
		service.isActive = false;

		var methods = [defaultOptIn, attach, detach, optIn];

		names.forEach(function (name, index) {
			if (!service[name]) {
				service[name] = methods[index];
			}
		});

		return io;

		function attach () {
			io.attach({
				name:     name,
				priority: priority,
				callback: callback
			});
			io[name].isActive = true;
		}

		function detach () {
			io.detach(name);
			io[name].isActive = false;
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
