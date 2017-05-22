/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
([], function () {
	'use strict';

	// service scaffolding

	function defaultOptIn (options) {
		return !options.transport && (!options.method || options.method.toUpperCase() == 'GET');
	}

	var names = ['theDefault', 'attach', 'detach', 'optIn'];

	return function (io, name, priority, callback) {
		var service = io[name] = io[name] || {};
		service.isActive = false;

		var methods = [defaultOptIn, attach, detach, optIn];

		names.forEach(function (name, index) {
			if (!(name in service)) {
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
