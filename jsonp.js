define(['./main'], function (io) {
	'use strict';

	// JSONP handler

	var counter = 0;

	function jsonpRequest (options) {
		var url = options.url,
			query = options.query || options.data,
			callback = options.callback || 'callback',
			name = '__io_jsonp_callback_' + (counter++),
			script = document.createElement('script'),
			deferred = new io.Deferred();
		query = query ? Object.create(query) : {};
		query[callback] = name;
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
		script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + io.makeQuery(query);
		document.documentElement.appendChild(script);
		return deferred.promise || deferred;
	}

	io.verbs.__jsonp = jsonpRequest;

	return io.makeVerb('__jsonp');
});
