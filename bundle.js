define(['./main', './FauxXHR'], function (io, FauxXHR) {
	'use strict';

	// cache and bundler for I/O

	var ioRequest, ioProcessSuccess, isOn = false,
		pending = {}, flying = {}, resolved = {}, delay = false;

	function attach () {
		if (!ioRequest) {
			ioRequest = io.request;
			io.request = request;
		}
		if (!ioProcessSuccess) {
			ioProcessSuccess = io.processSuccess;
			io.processSuccess = processSuccess;
		}
		isOn = true;
	}

	function detach () {
		if (io.request === request) {
			io.request = ioRequest;
			ioRequest = null;
		}
		if (io.processSuccess === processSuccess) {
			io.processSuccess = ioProcessSuccess;
			ioProcessSuccess = null;
		}
		isOn = false;
	}

	function isAttached () {
		return isOn;
	}


	function request (options) {
		// bypass if requested
		if (!isOn) {
			return ioRequest(options);
		}
		// check cache
		var key = io.bundle.makeKey(options), promise,
			canCache = io.bundle.canBeCached(options);
		if (canCache) {
			var data = io.bundle.cache.retrieve(key);
			if (typeof data !== 'undefined') {
				return io.Deferred.resolve(new io.Result(new FauxXHR(data), options, null));
			}
		}
		// check if in flight
		if (flying[key]) {
			return resolved[key].promise || resolved[key];
		}
		// check if required to wait
		if (options.wait) {
			if (resolved[key]) {
				return resolved[key].promise || resolved[key];
			}
			return flyRequest(key, canCache);
		}
		// check if can be bundled
		if (io.bundle.canBeBundled(options)) {
			promise = io.bundle.inspect(options);
			if (promise) {
				return promise;
			}
			var waitTime = io.bundle.waitTime,
				isBundling = io.bundle.isStarted();
			if (waitTime > 0 || isBundling) {
				if (!isBundling && waitTime > 0) {
					setTimeout(io.bundle.commit, waitTime);
					io.bundle.start();
				}
				if (pending[key]) {
					return resolved[key];
				}
				pending[key] = options;
				return flyRequest(key, canCache);
			}
		}
		if (!canCache) {
			return ioRequest(options);
		}
		// the default
		promise = flyRequest(key, canCache);
		var deferred = resolved[key];
		ioRequest(options).then(deferred.resolve.bind(deferred), deferred.reject.bind(deferred));
		return promise;
	}

	function saveToCache (key, xhr) {
		if (xhr.status >= 200 && xhr.status < 300) {
			io.bundle.cache.store(key, {
				status:       xhr.status,
				statusText:   xhr.statusText,
				responseType: xhr.responseType,
				responseText: xhr.responseText,
				headers:      xhr.getAllResponseHeaders()
			});
		}
	}

	function addToCache (promise) {
		promise.then(function (result) {
			var xhr = result.xhr;
			if (xhr.status >= 200 && xhr.status < 300) {
				saveToCache(io.bundle.makeKey(result.options), xhr);
			}
		});
		return promise;
	}

	function flyRequest(key, canCache) {
		var deferred = resolved[key];
		if (!deferred) {
			deferred = resolved[key] = new io.Deferred();
			var promise = deferred.promise || deferred;
			if (canCache) {
				addToCache(promise);
			}
			promise.then(cleanUp, cleanUp);
		}
		flying[key] = true;
		return deferred.promise || deferred;
		function cleanUp () {
			delete flying[key];
			delete resolved[key];
		}
	}

	function gather () {
		var bundle = Object.keys(pending).map(function (key) { return pending[key]; }),
			bundleSize = Math.max(io.bundle.maxSize, 2);
		pending = {};
		delay = false;
		if (bundle.length <= bundleSize) {
			// send a single bundle
			sendBundle(bundle);
			return;
		}
		// send several bundles
		for (var i = 0; i < bundle.length; i += bundleSize) {
			sendBundle(bundle.slice(i, i + bundleSize));
		}
	}

	function sendRequest (options) {
		var key = io.bundle.makeKey(options),
			deferred = resolved[key];
		ioRequest(options).then(deferred.resolve.bind(deferred), deferred.reject.bind(deferred));
	}

	function sendBundle (bundle) {
		if (bundle.length < Math.max(Math.min(io.bundle.minSize, io.bundle.maxSize), 1)) {
			// small bundle => send each item separately
			return bundle.forEach(sendRequest);
		}
		// send a bundle
		io({
			url:    io.bundle.url,
			method: 'PUT',
			bundle: false,
			data:   bundle.map(flattenOptions)
		});
	}

	function flattenOptions (options) {
		var newOptions = {};
		for (var key in options) {
			newOptions[key] = options[key];
		}
		return newOptions;
	}


	function processSuccess (result) {
		var data = ioProcessSuccess(result);
		if (isOn && !(data && typeof data.then == 'function')) {
			io.bundle.unbundle(data);
		}
		return data;
	}

	function unbundle (data) {
		var bundle = io.bundle.detect(data);
		if (bundle) {
			bundle.forEach(function (result) {
				var key = io.bundle.makeKey(result.options),
					xhr = new FauxXHR(result.response),
					value = resolved[key];
				if (value) {
					value.resolve(new io.Result(xhr, result.options, null));
				} else {
					saveToCache(key, xhr);
				}
			});
		}
	}

	function detect (data) {
		return data && typeof data == 'object' && data.bundle === 'bundle' &&
			data.results instanceof Array ? data.results : null;
	}


	function fly (bundle) {
		if (isOn) {
			bundle.forEach(function (options) {
				options = io.processOptions(typeof options == 'string' ? {url: options} : options);
				flyRequest(io.bundle.makeKey(options), io.bundle.canBeCached(options));
			});
		}
	}

	function submit (bundle) {
		if (!isOn || io.bundle.isStarted()) {
			bundle.forEach(io);
		} else {
			io.bundle.start();
			bundle.forEach(io);
			io.bundle.commit();
		}
	}

	function submitWithRelated (options, bundle) {
		var promise;
		if (!isOn || io.bundle.isStarted()) {
			bundle.forEach(io);
			promise = io(options);
		} else {
			io.bundle.start();
			bundle.forEach(io);
			promise = io(options);
			io.bundle.commit();
		}
		return promise;
	}

	function start () {
		if (isOn) {
			delay = true;
		}
	}

	function commit () {
		if (isOn) {
			gather();
		}
	}

	function isStarted () {
		return isOn && delay;
	}


	function remove (options) {
		options = io.processOptions(typeof options == 'string' ? {url: options} : options);
		io.bundle.cache.remove(io.bundle.makeKey(options));
	}


	function makeStorageCache (type) {
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


	function defaultOptIn (options) {
		return !options.method || options.method.toUpperCase() == 'GET';
	}

	function canBeCached (options) {
		if ('cache' in options) {
			return options.cache;
		}
		var optIn = io.bundle.defaultCache;
		return typeof optIn == 'function' ? optIn(options) : optIn;
	}

	function canBeBundled (options) {
		if ('bundle' in options) {
			return options.bundle;
		}
		var optIn = io.bundle.defaultBundle;
		return typeof optIn == 'function' ? optIn(options) : optIn;
	}

	function makeKey (options) {
		return io.bundle.prefix + options.method + '-' + io.buildUrl(options);
	}


	io.FauxXHR = FauxXHR;

	io.bundle = {
		// defaults
		defaultCache:  defaultOptIn,
		defaultBundle: defaultOptIn,
		// decisions
		canBeCached:   canBeCached,
		canBeBundled:  canBeBundled,
		// inspector to augment requests
		inspect:       function () { return null; },
		// cache controls
		prefix:   'io-',
		makeKey:  makeKey,
		remove:   remove,
		cache:    makeStorageCache('sessionStorage'),
		makeStorageCache: makeStorageCache,
		// attach/detach the I/O bundle manager
		attach:   attach,
		detach:   detach,
		isAttached: isAttached,
		// start/commit bundles
		start:    start,
		commit:   commit,
		isStarted: isStarted,
		waitTime: 20, // in ms
		// server-side bundle settings
		url: '/bundle',
		minSize:  2,
		maxSize:  20,
		detect:   detect,
		// advanced utilities
		unbundle: unbundle,
		submit:   submit,
		submitWithRelated: submitWithRelated,
		fly:      fly
	};

	return io;
});
