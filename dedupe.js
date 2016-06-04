define(['./main', './scaffold'], function (io, scaffold) {
	'use strict';

	// keep track of I/O requests

	function dedupe (options, key, blacklist) {
		if (!io.dedupe.optIn(options)) {
			return null;
		}

		var deferred = io.dedupe.deferred[key];

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
		deferred = io.dedupe.deferred[key];
		blacklist.dedupe = 1;
		var newPromise = io.request(options, key, blacklist);
		if (promise !== newPromise) {
			newPromise.then(
				function (value) { deferred.resolve(value, true); },
				function (value) { deferred.reject (value, true); }
			);
		}
		return promise;
	}

	function flyByKey(key) {
		var deferred = io.dedupe.deferred[key], needsCleanUp = false;
		if (!deferred) {
			deferred = io.dedupe.deferred[key] = new io.Deferred();
			needsCleanUp = true;
		}
		var promise = deferred.promise || deferred;
		if (needsCleanUp) {
			promise.then(cleanUp, cleanUp);
		}
		return promise;
		function cleanUp () {
			delete io.dedupe.deferred[key];
		}
	}

	function fly (options) {
		options = io.processOptions(typeof options == 'string' ?
			{url: options, method: 'GET'} : options);
		return io.dedupe.flyByKey(io.makeKey(options));
	}

	function isFlying (options) {
		options = io.processOptions(typeof options == 'string' ?
			{url: options, method: 'GET'} : options);
		return io.dedupe.deferred[io.makeKey(options)];
	}


	// export

	io.dedupe = {
		flyByKey: flyByKey,
		fly:      fly,
		isFlying: isFlying,

		deferred: {}
	};
	return scaffold(io, 'dedupe', 30, dedupe);
});
