/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
(['./io', './scaffold'], function (io, scaffold) {
	'use strict';

	// implement retries for unreliable I/O requests

	function retry (options, prep, level) {
		if (typeof options.retries != 'number' || !io.retry.optIn(options)) {
			return null;
		}

		// pass the request, and retry conditionally
		var retries = options.retries,
			continueRetries = typeof options.continueRetries == 'function' ? options.continueRetries : continueRetriesIfNot2XX,
			nextDelay = typeof options.nextDelay == 'function' ? options.nextDelay : io.retry.nextDelay,
			delayMs = typeof options.initDelay == 'number' ? options.initDelay : io.retry.initDelay,
			currentRetry = 0;

		return io.request(options, prep, level - 1).then(retries > 0 ? loop : condLoop);

		function loop(result) {
			++currentRetry;
			if (--retries >= 0 && continueRetries(result, currentRetry)) {
				delayMs = nextDelay(delayMs, currentRetry, options);
				return io.retry.delay(delayMs).then(function() { return io.request(options, prep, level - 1); }).then(loop);
			}
			return result;
		}

		function condLoop(result) {
			++currentRetry;
			if (continueRetries(result, currentRetry)) {
				delayMs = nextDelay(delayMs, currentRetry, options);
				return io.retry.delay(delayMs).then(function() { return io.request(options, prep, level - 1); }).then(condLoop);
			}
			return result;
		}
	}

	function delay (ms) {
		var d = new io.Deferred();
		setTimeout(function () { d.resolve(ms); }, ms);
		return d.promise || d;
	}

	function continueRetriesIfNot2XX (result) { return result.xhr && (result.xhr.status < 200 || result.xhr.status >= 300); }

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
