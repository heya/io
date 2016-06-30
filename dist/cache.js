(function(_,f){f(window.heya.io,window.heya.io.FauxXHR,window.heya.io.scaffold);})
(['./io', './FauxXHR', './scaffold'], function (io, FauxXHR, scaffold) {
	'use strict';

	// cache I/O requests

	function cache (options, prep, level) {
		var key = prep.key;

		if (options.wait || io.track && io.track.deferred[key] || !io.cache.optIn(options)) {
			return null;
		}

		// retrieve data, if available
		var data = io.cache.storage.retrieve(key);
		if (typeof data !== 'undefined') {
			return io.Deferred.resolve(new io.Result(new FauxXHR(data), options, null));
		}

		// pass the request, and cache the result
		var promise = io.request(options, prep, level - 1);
		promise.then(function (result) { saveByKey(key, result); });
		return promise;
	}

	function saveByKey (key, result) {
		var xhr;
		if (result instanceof XMLHttpRequest || result instanceof FauxXHR) {
			xhr = result;
		} else if (result instanceof io.Result) {
			xhr = result.xhr;
		}
		if (xhr) {
			if (xhr.status >= 200 && xhr.status < 300) {
				io.cache.storage.store(key, {
					status:       xhr.status,
					statusText:   xhr.statusText,
					responseType: xhr.responseType,
					responseText: xhr.responseText,
					headers:      xhr.getAllResponseHeaders()
				});
			}
		} else {
			io.cache.storage.store(key, {
				status:       200,
				statusText:   'OK',
				responseType: 'json',
				response:     result,
				headers:      'Content-Type: application/json'
			});
		}
	}

	function save (options, result) {
		options = io.processOptions(typeof options == 'string' ?
			{url: options, method: 'GET'} : options);
		io.cache.saveByKey(io.makeKey(options), result);
	}

	function remove (options) {
		options = io.processOptions(typeof options == 'string' ?
			{url: options, method: 'GET'} : options);
		io.cache.storage.remove(io.makeKey(options));
	}

	function makeStorage (type) {
		return {
			retrieve: function (key) {
				var data = window[type].getItem(key);
				return data === null ? void 0 : JSON.parse(data);
			},
			store: function (key, data) {
				window[type].setItem(key, JSON.stringify(data));
			},
			remove: function (key) {
				window[type].removeItem(key);
			},
			clear: function () {
				window[type].clear();
			}
		};
	}


	// export

	io.cache = {
		saveByKey:   saveByKey,
		save:        save,
		remove:      remove,
		makeStorage: makeStorage,
		storage:     makeStorage('sessionStorage')
	};
	return scaffold(io, 'cache', 40, cache);
});
