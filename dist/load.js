(function(_,f){window.heya.io.load=f(window.heya.io);})
(['./io'], function (io) {
	'use strict';

	// script handler

	function loadRequest (options, prep) {
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

	io.transports.load = loadRequest;

	return io.makeVerb('load', 'transport');
});
