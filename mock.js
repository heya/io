define(['./main', './FauxXHR', './scaffold'], function (io, FauxXHR, scaffold) {
	'use strict';

	// mock I/O requests

	function mock (options, blacklist) {
		if (!io.mock.optIn(options)) {
			return null;
		}

		var url = options.url, callback = io.mock.precise[url];
		if (!callback) {
			var index = find(url), wildcard = io.mock.wildcard;
			if (index < wildcard.length) {
				var pattern = wildcard[index].url;
				if (url.length >= pattern.length && pattern === url.substring(0, pattern.length)) {
					callback = wildcard[index].callback;
				}
			}
		}

		return callback ? wrap(options, callback(options)) : null;
	}

	function find (url) {
		// binary search, see https://github.com/heya/ctr/blob/master/algos/binarySearch.js
		var wildcard = io.mock.wildcard, l = 0, r = wildcard.length;
		while (l < r) {
			var m = ((r - l) >> 1) + l;
			if (wildcard[m].name < url) {
				l = m + 1;
			} else {
				r = m;
			}
		}
		return l;
	}

	function wrap (options, value) {
		if (value instanceof io.FauxXHR) {
			value = new io.Result(xhr, options, null);
		}
		return value && typeof value.then == 'function' ? value : io.Deferred.resolved(value);
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
				// wildcard
				url = url.substring(0, url.length - 1);
				var index = find(url), wildcard = io.mock.wildcard;
				if (index < wildcard.length) {
					if (url === wildcard[index].url) {
						if (callback) {
							wildcard[index].callback = callback;
						} else {
							wildcard.splice(index, 1);
						}
						return;
					}
				}
				wildcard.splice(index, 0, {url: url, callback: callback});
			} else {
				// precise
				if (callback) {
					io.mock.precise[url] = callback;
				} else {
					delete io.mock.precise[url];
				}
			}
		}
	};

	io.mock.theDefault = true;

	io.mock.precise    = {};
	io.mock.wildcard   = [];

	io.makeXHR         = makeXHR;

	return scaffold(io, 'mock', 20, mock);
});
