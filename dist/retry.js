(function(_,f){window.heya.io.retry=f(window.heya.io,window.heya.io.scaffold);})
(['./io', './scaffold'], function (io, scaffold) {
	'use strict';

	// implement retries for unreliable I/O requests

	function retry (options, prep, level) {
		if (typeof options.retries != 'number' || !io.retry.optIn(options)) {
			return null;
		}

		// pass the request, and retry conditionally
		var retries = options.retries,
			isFailed = typeof options.isFailed == 'function' ? options.isFailed : allowOnly2XX,
			currentRetry = 0,
			delayMs = io.retry.initDelay;

		if (retries > 1) return io.request(options, prep, level - 1).then(loop);
		if (isFailed) return io.request(options, prep, level - 1).then(condLoop);
		return null;

		function loop(xhr) {
			++currentRetry;
			if (--retries >= 0 && (!isFailed || isFailed(xhr, currentRetry, options))) {
				delayMs = io.retry.nextDelay(delayMs, currentRetry, options);
				return delay(delayMs).then(function() { return io.request(options, prep, level - 1); }).then(loop);
			}
			return xhr;
		}

		function condLoop(xhr) {
			++currentRetry;
			if (isFailed(xhr, currentRetry, options)) {
				delayMs = io.retry.nextDelay(delayMs, currentRetry, options);
				return delay(delayMs).then(function() { return io.request(options, prep, level - 1); }).then(condLoop);
			}
			return xhr;
		}
	}

	function delay (ms) {
		var d = new io.Deferred();
		setTimeout(function () { d.resolve(ms); }, ms);
		return d.promise || d;
	}

	function allowOnly2XX (xhr) { return xhr.status < 200 || xhr.status >= 300; }

	function defaultOptIn (options) { return !options.transport; }

	// export

	io.retry = {
		delay: delay,
		initDelay: 50, //ms
		nextDelay: function (delay, retry, options) { return delay; },
		defaultOptIn: defaultOptIn
	};
	return scaffold(io, 'retry', 25, retry);
});
