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
		script.src = prep.url + (prep.url.indexOf('?') >= 0 ? '&' : '?') +
			'callback=' + encodeURIComponent(name);
		document.documentElement.appendChild(script);
		return deferred.promise || deferred;
	}

	io.transports.__load = loadRequest;

	return io.makeVerb('__load', 'transport');
});
