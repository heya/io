(function(_,f,g){g=window;g=g.heya||(g.heya={});g=g.io||(g.io={});g.url=f();})
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
