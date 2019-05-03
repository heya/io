(function(_,f){f(window.heya.io,window.heya.io.FauxXHR,window.heya.io.scaffold);})
(['./io', './FauxXHR', './scaffold'], function (io, FauxXHR, scaffold) {
	'use strict';

	// mock I/O requests

	function mock (options, prep, level) {
		if (!io.mock.optIn(options)) {
			return null;
		}

		var url = options.url, callback = io.mock.exact[url];
		if (!callback) {
			var index = find(url), prefix = io.mock.prefix;
			if (index < prefix.length && url === prefix[index].url) {
				callback = prefix[index].callback;
			} else {
				for (var i = index - 1; i >= 0; --i) {
					var pattern = prefix[i].url;
					if (pattern.length <= url.length && pattern === url.substring(0, pattern.length)) {
						callback = prefix[i].callback;
						break;
					}
				}
			}
		}
		if (!callback) {
			const regexps = io.mock.regexp;
			for (let i = 0; i < regexps.length; ++i) {
				const value = regexps[i];
				if (value.url.test(url)) {
					callback = value.callback;
					break;
				}
			}
		}
		if (!callback) {
			const match = io.mock.match;
			for (let i = 0; i < match.length; ++i) {
				const value = match[i];
				if (value.url(options, prep, level)) {
					callback = value.callback;
					break;
				}
			}
		}

		return callback ? wrap(options, callback(options, prep, level)) : null;
	}

	function find (url) {
		// binary search, see https://github.com/heya/ctr/blob/master/algos/binarySearch.js
		var prefix = io.mock.prefix, l = 0, r = prefix.length;
		while (l < r) {
			var m = ((r - l) >> 1) + l, x = prefix[m].url;
			if (x < url) {
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
				if (index < prefix.length && url === prefix[index].url) {
					if (callback) {
						prefix[index].callback = callback;
					} else {
						prefix.splice(index, 1);
					}
					return;
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
		} else if (url instanceof RegExp) {
			const regexps = io.mock.regexp;
			for (let i = 0; i < regexps.length; ++i) {
				const value = regexps[i];
				if (value.url.source == url.source && value.url.flags == url.flags) {
					if (callback) {
						value.callback = callback;
					} else {
						regexps.splice(i, 1);
					}
					return;
				}
			}
			regexps.splice(regexps.length, 0, {url: url, callback: callback});
		} else if (typeof url == 'function') {
			const match = io.mock.match;
			for (let i = 0; i < match.length; ++i) {
				const value = match[i];
				if (value.url === url) {
					if (callback) {
						value.callback = callback;
					} else {
						match.splice(i, 1);
					}
					return;
				}
			}
			match.splice(match.length, 0, {url: url, callback: callback});
		}
	};

	io.mock.theDefault = true;

	io.mock.exact  = {};
	io.mock.prefix = [];
	io.mock.regexp = [];
	io.mock.match  = [];

	io.mock.makeXHR = makeXHR;

	return scaffold(io, 'mock', 20, mock);
});
