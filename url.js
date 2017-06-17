/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
([], function () {
	'use strict';

	return function url (parts) {
		var result = parts[0] || '';
		for (var i = 1; i < parts.length; ++i) {
			result += encodeURIComponent(arguments[i]) + parts[i];
		}
		return result;
	};
});
