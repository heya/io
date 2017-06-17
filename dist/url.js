(function(_,f){window.heya.io.url=f(window.heya.io,window.heya.io.scaffold);})
(['./io', './scaffold'], function (io, scaffold) {
	'use strict';

	return function url (parts) {
		var result = parts[0] || '';
		for (var i = 1; i < parts.length; ++i) {
			result += encodeURIComponent(arguments[i]) + parts[i];
		}
		return result;
	};
});
