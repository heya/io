(function(_,f){f(window.heya.io,window.heya.io.scaffold);})
(['./io', './scaffold'], function (io, scaffold) {
	'use strict';

	// keep track of I/O requests

	function track (options, prep, level) {
		if (!io.track.optIn(options)) {
			return null;
		}

		var key = prep.key, deferred = io.track.deferred[key];

		// check if in flight
		if (deferred) {
			return deferred.promise || deferred;
		}

		// check if required to wait
		if (options.wait) {
			return flyByKey(key);
		}

		// register a request
		var promise = flyByKey(key);
		deferred = io.track.deferred[key];
		var newPromise = io.request(options, prep, level - 1);
		if (promise !== newPromise) {
			newPromise.then(
				function (value) { deferred.resolve(value, true); },
				function (value) { deferred.reject (value, true); }
			);
		}
		return promise;
	}

	function flyByKey(key) {
		var deferred = io.track.deferred[key], needsCleanUp = false;
		if (!deferred) {
			deferred = io.track.deferred[key] = new io.Deferred();
			needsCleanUp = true;
		}
		var promise = deferred.promise || deferred;
		if (needsCleanUp) {
			promise.then(cleanUp, cleanUp);
		}
		return promise;
		function cleanUp () {
			delete io.track.deferred[key];
		}
	}

	function fly (options) {
		options = io.processOptions(typeof options == 'string' ?
			{url: options, method: 'GET'} : options);
		return io.track.flyByKey(io.makeKey(options));
	}

	function isFlying (options) {
		options = io.processOptions(typeof options == 'string' ?
			{url: options, method: 'GET'} : options);
		return io.track.deferred[io.makeKey(options)];
	}


	// export

	io.track = {
		flyByKey: flyByKey,
		fly:      fly,
		isFlying: isFlying,

		deferred: {}
	};
	return scaffold(io, 'track', 40, track);
});
