(function(_,f,g){g=window;g=g.heya||(g.heya={});g=g.io||(g.io={});g.FauxXHR=f();})
([], function () {
	'use strict';

	// Faux XHR stand-in to provide a placeholder for cached data

	var isXml = /^(?:application|text)\/(?:x|ht)ml\b/;

	function FauxXHR (cached) {
		// initialize
		['status', 'statusText', 'responseType', 'responseText', 'headers'].forEach(function (key) {
			this[key] = cached[key];
		}.bind(this));
		// create response, if required
		var mime = this.getResponseHeader('Content-Type');
		switch (this.responseType) {
			case 'arraybuffer':
				this.response = new ArrayBuffer(2 * this.responseText.length);
				for (var view = new Uint16Array(this.response), i = 0, n = this.responseText.length; i < n; ++i) {
					view[i] = this.responseText.charCodeAt(i);
				}
				break;
			case 'blob':
				this.response = new Blob([this.responseText], {type: mime});
				break;
			case 'document':
				this.response = new DOMParser().parseFromString(this.responseText, mime);
				break;
			case 'json':
				this.response = JSON.parse(this.responseText);
				break;
			default:
				this.response = this.responseText;
				break;
		}
		this.responseXML = null;
		if (this.responseType == 'document') {
			this.responseXML = this.response;
		} else {
			var xmlMime = isXml.exec(mime);
			if (xmlMime) {
				this.responseXML = new DOMParser().parseFromString(this.responseText, xmlMime[0]);
			}
		}
	}
	FauxXHR.prototype = {
		readyState: 4, // DONE
		timeout: 0, // no timeout
		getAllResponseHeaders: function () {
			return this.headers;
		},
		getResponseHeader: function (header) {
			var values = this.headers.match(new RegExp('^' + header + ': .*$', 'gmi'));
			return values ? values.map(function (s) { return s.slice(header.length + 2); }).join(', ') : null;
		}
	};

	return FauxXHR;
});
