define(['./io', './scaffold'], function (io, scaffold) {
	'use strict';

	// implement retries for unreliable I/O requests

	function retry (options, prep, level) {
		if (typeof options.retries != 'number' || !io.retry.optIn(options)) {
			return null;
		}

		// pass the request, and retry conditionally
		var retries = options.retries,
			continueRetries = typeof options.continueRetries == 'function' ? options.continueRetries : continueRetriesIfNot2XX,
			currentRetry = 0,
			delayMs = io.retry.initDelay;

		if (retries > 0) return io.request(options, prep, level - 1).then(loop);
		if (continueRetries) return io.request(options, prep, level - 1).then(condLoop);
		return null;

		function loop(xhr) {
			++currentRetry;
			if (--retries >= 0 && (!continueRetries || continueRetries(xhr, currentRetry, options))) {
				delayMs = io.retry.nextDelay(delayMs, currentRetry, options);
				return io.retry.delay(delayMs).then(function() { return io.request(options, prep, level - 1); }).then(loop);
			}
			return xhr;
		}

		function condLoop(xhr) {
			++currentRetry;
			if (continueRetries(xhr, currentRetry, options)) {
				delayMs = io.retry.nextDelay(delayMs, currentRetry, options);
				return io.retry.delay(delayMs).then(function() { return io.request(options, prep, level - 1); }).then(condLoop);
			}
			return xhr;
		}
	}

	function delay (ms) {
		var d = new io.Deferred();
		setTimeout(function () { d.resolve(ms); }, ms);
		return d.promise || d;
	}

	function continueRetriesIfNot2XX (xhr) { return xhr.status < 200 || xhr.status >= 300; }

	function defaultOptIn (options) { return !options.transport; }

	// export

	io.retry = {
		delay: delay,
		initDelay: 50, //ms
		nextDelay: function (delay, retry, options) { return delay; },
		defaultOptIn: defaultOptIn
	};
	return scaffold(io, 'retry', 30, retry);
});
