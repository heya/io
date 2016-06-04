define(['./dedupe', './FauxXHR', './scaffold'], function (io, FauxXHR, scaffold) {
	'use strict';

	// bundle I/O requests

	function bundle (options, key, blacklist) {
		if (!io.bundle.optIn(options) || options.wait) {
			return null;
		}

		var waitTime = io.bundle.waitTime,
			isBundling = io.bundle.isStarted();

		if (isBundling || waitTime > 0) {
			if (!isBundling && waitTime > 0) {
				setTimeout(io.bundle.commit, waitTime);
				io.bundle.start();
			}
			if (io.bundle.pending[key]) {
				var deferred = io.dedupe.deferred[key];
				return deferred.promise || deferred;
			}
			io.bundle.pending[key] = options;
			return io.dedupe.flyByKey(key);
		}

		return null;
	}

	var delay = false;

	function start () {
		delay = true;
	}

	function isStarted () {
		return delay;
	}

	function commit () {
		var bundle = Object.keys(io.bundle.pending).map(function (key) {
				return io.bundle.pending[key];
			}),
			bundleSize = Math.max(io.bundle.maxSize, 2);
		io.bundle.pending = {};
		delay = false;
		if (bundle.length <= bundleSize) {
			// send a single bundle
			sendBundle(bundle);
		} else {
			// send several bundles
			for (var i = 0; i < bundle.length; i += bundleSize) {
				sendBundle(bundle.slice(i, i + bundleSize));
			}
		}
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
		}).then(unbundle);
	}

	function sendRequest (options) {
		var key = io.makeKey(options), deferred = io.dedupe.deferred[key];
		io.request(options, {bundle: 1}).then(deferred.resolve.bind(deferred),
			deferred.reject.bind(deferred));
	}

	function flattenOptions (options) {
		var newOptions = {};
		for (var key in options) {
			newOptions[key] = options[key];
		}
		return newOptions;
	}


	// processing bundles

	function unbundle (data) {
		var bundle = io.bundle.detect(data);
		if (bundle) {
			bundle.forEach(function (result) {
				var key = io.makeKey(result.options),
					xhr = new FauxXHR(result.response),
					deferred = io.dedupe.deferred[key];
				if (deferred) {
					deferred.resolve(new io.Result(xhr, result.options, null));
				} else {
					io.cache && io.cache.saveByKey(key, xhr);
				}
			});
		}
	}

	function detect (data) {
		return data && typeof data == 'object' && data.bundle === 'bundle' &&
			data.results instanceof Array ? data.results : null;
	}

	function processSuccess (result) {
		var data = ioProcessSuccess(result);
		if (isOn && !(data && typeof data.then == 'function')) {
			io.bundle.unbundle(data);
		}
		return data;
	}


	// convenience functions

	function fly (bundle) {
		bundle.forEach(io.dedupe.fly);
	}

	function submit (bundle) {
		if (io.bundle.isStarted()) {
			bundle.forEach(io);
		} else {
			io.bundle.start();
			bundle.forEach(io);
			io.bundle.commit();
		}
	}

	function submitWithRelated (options, bundle) {
		var promise;
		if (io.bundle.isStarted()) {
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


	// export

	io.bundle = {
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
		fly:      fly,

		pending: {}
	};
	return scaffold(io, 'bundle', 10, bundle);
});
