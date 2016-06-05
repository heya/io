define(['./io'], function (io) {
	'use strict';

	// JSONP handler

	var counter = 0;

	function jsonpRequest (options, prep) {
		var callback = options.callback || 'callback',
			name = '__io_jsonp_callback_' + (counter++),
			script = document.createElement('script'),
			deferred = new io.Deferred();
		window[name] = function (value) {
			delete window[name];
			script.parentNode.removeChild(script);
			deferred.resolve(value);
		};
		script.onerror = function (e) {
			delete window[name];
			script.parentNode.removeChild(script);
			deferred.reject(new io.FailedIO(null, options, e));
		};
		script.src = prep.url + (prep.url.indexOf('?') >= 0 ? '&' : '?') +
			'callback=' + encodeURIComponent(name);
		document.documentElement.appendChild(script);
		return deferred.promise || deferred;
	}

	io.transports.__jsonp = jsonpRequest;

	return io.makeVerb('__jsonp', 'transport');
});
