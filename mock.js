define(['./main', './FauxXHR', './scaffold'], function (io, FauxXHR, scaffold) {
	'use strict';

	// mock I/O requests

	function mock (options, blacklist) {
		if (!io.mock.optIn(options)) {
			return null;
		}

		var url = options.url, callback = io.mock.exact[url];
		findCallback: {
			if (callback) {
				break findCallback;
			}
			for (var prefix = io.mock.prefix, i = 0; i < prefix.length; ++i) {
				var pattern = prefix[i].url;
				if (pattern.length <= url.length && pattern === url.substring(0, pattern.length)) {
					callback = prefix[i].callback;
					break findCallback;
				}
			}
			return null;
		}

		return wrap(options, callback(options));
	}

	function find (url) {
		// binary search, see https://github.com/heya/ctr/blob/master/algos/binarySearch.js
		var prefix = io.mock.prefix, l = 0, r = prefix.length;
		while (l < r) {
			var m = ((r - l) >> 1) + l, x = prefix[m].url;
			if (x.length > url.length || x.length == url.length && x < url) {
				l = m + 1;
			} else {
				r = m;
			}
		}
		return l;
	}

	function wrap (options, value) {
		if (value instanceof FauxXHR) {
			value = new io.Result(value, options, null);
		}
		return value && typeof value.then == 'function' ? value : io.Deferred.resolve(value);
	}

	function makeXHR (xhr) {
		return new FauxXHR({
			status:       xhr.status || 200,
			statusText:   xhr.statusText || 'OK',
			responseType: xhr.responseType || '',
			responseText: xhr.responseText || '',
			headers:      xhr.headers || ''
		});
	}


	// export

	io.mock = function (url, callback) {
		if (url && typeof url == 'string') {
			if (url.charAt(url.length - 1) === '*') {
				// prefix
				url = url.substring(0, url.length - 1);
				var index = find(url), prefix = io.mock.prefix;
				if (index < prefix.length) {
					if (url === prefix[index].url) {
						if (callback) {
							prefix[index].callback = callback;
						} else {
							prefix.splice(index, 1);
						}
						return;
					}
				}
				prefix.splice(index, 0, {url: url, callback: callback});
			} else {
				// exact
				if (callback) {
					io.mock.exact[url] = callback;
				} else {
					delete io.mock.exact[url];
				}
			}
		}
	};

	io.mock.theDefault = true;

	io.mock.exact  = {};
	io.mock.prefix = [];

	io.mock.makeXHR = makeXHR;

	return scaffold(io, 'mock', 20, mock);
});
