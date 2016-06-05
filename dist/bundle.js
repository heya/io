(function(_,f){f(window.heya.io,window.heya.io.FauxXHR,window.heya.io.scaffold);})
(['./track', './FauxXHR', './scaffold'], function (io, FauxXHR, scaffold) {
	'use strict';

	// bundle I/O requests

	function bundle (options, prep, level) {
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
			io.bundle.pending[prep.key] = {options: options, prep: prep, level: level};
			var deferred = io.track.deferred[prep.key];
			return deferred.promise || deferred;
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
			data:   bundle.map(function (item) {
				return flattenOptions(item.options);
			})
		}).then(unbundle);
	}

	function sendRequest (item) {
		var key = item.prep.key, deferred = io.track.deferred[key];
		io.request(item.options, item.prep, item.level - 1).then(
			function (value) { deferred.resolve(value, true); },
			function (value) { deferred.reject (value, true); }
		);
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
					deferred = io.track.deferred[key];
				if (deferred) {
					deferred.resolve(new io.Result(xhr, result.options, null), true);
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
		bundle.forEach(io.track.fly);
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

	function attach () {
		io.track.attach();
		io.attach({
			name:     'bundle',
			priority: 10,
			callback: bundle
		});
	}

	io.bundle = {
		attach: attach,

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
