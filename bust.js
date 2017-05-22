/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
(['./io'], function (io) {
	'use strict';

	io.bustKey = 'io-bust';

	io.generateTimestamp = function (options) {
		return (new Date().getTime()) + '-' + Math.floor(Math.random() * 1000000);
	};

	var oldBuildUrl = io.buildUrl;
	io.buildUrl = function (options) {
		var url = oldBuildUrl(options);
		if (options.bust) {
			var key = options.bust === true ? io.bustKey : options.bust;
			return url + (url.indexOf('?') < 0 ? '?' : '&') +
				key + '=' + io.generateTimestamp(options);
		}
		return url;
	};

	return io;
});
