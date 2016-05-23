define(['./main'], function (io) {
	'use strict';

	// JSONP handler

	var counter = 0;

	function load (options, data) {
		options = io.processOptions(typeof options == 'string' ? {url: options} : options);
		var url = options.url,
			query = options.query || options.data || data || {},
			script = document.createElement('script'),
			deferred = new io.Deferred();
		script.onload = function () {
			deferred.resolve();
		};
		script.onerror = function (e) {
			deferred.reject(new io.FailedIO(null, options, e));
		};
		script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + io.makeQuery(query);
		document.documentElement.appendChild(script);
		return (deferred.promise || deferred).catch(options.processFailure || io.processFailure);
	}

	return load;
});
