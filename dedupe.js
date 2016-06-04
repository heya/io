define(['./main', './scaffold'], function (io, scaffold) {
	'use strict';

	// dedupe identical I/O requests

	function dedupe (options, key, blacklist) {
		if (!io.dedupe.optIn(options)) {
			return null;
		}

		var deferred = io.dedupe.deferred[key];

		// check if in flight
		if (io.dedupe.flying[key]) {
			return deferred.promise || deferred;
		}

		// check if required to wait
		if (options.wait) {
			if (deferred) {
				return deferred.promise || deferred;
			}
			return flyByKey(key);
		}

		// register a request
		var promise = flyByKey(key);
		deferred = io.dedupe.deferred[key];
		blacklist.dedupe = 1;
		io.request(options, key, blacklist).then(deferred.resolve.bind(deferred),
			deferred.reject.bind(deferred));
		return promise;
	}

	function flyByKey(key) {
		var deferred = io.dedupe.deferred[key], needsCleanUp = false;
		if (!deferred) {
			deferred = io.dedupe.deferred[key] = new io.Deferred();
			needsCleanUp = true;
		}
		io.dedupe.flying[key] = true;
		var promise = deferred.promise || deferred;
		if (needsCleanUp) {
			promise.then(cleanUp, cleanUp);
		}
		return promise;
		function cleanUp () {
			delete io.dedupe.flying[key];
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
		return io.dedupe.flying[io.makeKey(options)];
	}


	// export

	io.dedupe = {
		flyByKey: flyByKey,
		fly:      fly,
		isFlying: isFlying,

		flying:   {},
		deferred: {}
	};
	return scaffold(io, 'dedupe', 30, dedupe);
});
