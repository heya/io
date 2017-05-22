define(['./io'], function (io) {
	'use strict';

	// script handler
	// This is a browser-only module.

	function loadTransport (options, prep) {
		var script = document.createElement('script'),
			deferred = new io.Deferred();
		script.onload = function () {
			deferred.resolve();
		};
		script.onerror = function (e) {
			deferred.reject(new io.FailedIO(null, options, e));
		};
		script.src = prep.url;
		document.documentElement.appendChild(script);
		return deferred.promise || deferred;
	}

	io.transports.load = loadTransport;

	return io.makeVerb('load', 'transport');
});
