define(['./io', './FauxXHR', './scaffold'], function (io, FauxXHR, scaffold) {
	'use strict';

	// cache I/O requests
	// this is a browser-only module.

	function cache (options, prep, level) {
		var key = prep.key;

		if (options.wait || options.bust ||
				io.track && io.track.deferred[key] ||
				!io.cache.optIn(options)) {
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
		} else if (result && (result.xhr instanceof XMLHttpRequest || result.xhr instanceof FauxXHR)) {
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
		options = io.processOptions(typeof options == 'string' ? {url: options, method: 'GET'} : options);
		io.cache.saveByKey(io.makeKey(options), result);
	}

	function remove(options) {
		if (typeof options == 'function') {
			var keys = io.cache.storage.getKeys(),
				regexp = new RegExp('^.{' + io.prefix.length + '}(.*)$');
			for (var i = 0; i < keys.length; ++i) {
				var key = keys[i], m = regexp.exec(key);
				if (m && options(m[1])) {
					io.cache.storage.remove(key);
				}
			}
			return;
		}
		if (options instanceof RegExp) {
			var keys = io.cache.storage.getKeys(),
				regexp = new RegExp('^.{' + io.prefix.length + '}(.*)$');
			for (var i = 0; i < keys.length; ++i) {
				var key = keys[i], m = regexp.exec(key);
				if (m && options.test(m[1])) {
					io.cache.storage.remove(key);
				}
			}
			return;
		}
		options = io.processOptions(typeof options == "string" ? {url: options, method: "GET"} : options);
		var url = options.url;
		if (url && url.charAt(url.length - 1) == "*") {
			var prefix = url.slice(0, url.length - 1), pl = prefix.length,
				keys = io.cache.storage.getKeys(),
				regexp = new RegExp('^.{' + (io.prefix.length + 1) + '}\\w+\\-(.*)$');
			for (var i = 0; i < keys.length; ++i) {
				var key = keys[i], m = regexp.exec(key);
				if (m && m[1].slice(0, pl) == prefix) {
					io.cache.storage.remove(key);
				}
			}
			return;
		}
		io.cache.storage.remove(io.makeKey(options));
	}

	function clear() { io.cache.storage.clear(); }

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
			},
			getKeys: function() {
				var storage = window[type], keys = [], prefix = io.prefix, pl = prefix.length;
				for (var i = 0, n = storage.length; i < n; ++i) {
					var key = storage.key(i);
					if (prefix == key.slice(0, pl)) {
						keys.push(key);
					}
				}
				return keys;
			}
		};
	}


	// export

	io.cache = {
		saveByKey:   saveByKey,
		save:        save,
		remove:      remove,
		clear:       clear,
		makeStorage: makeStorage,
		storage:     makeStorage('sessionStorage')
	};
	return scaffold(io, 'cache', 50, cache);
});
