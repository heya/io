/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
([], function () {
	'use strict';

	// Faux XHR stand-in to provide a placeholder for cached data

	var isXml = /^(?:application|text)\/(?:x|ht)ml\b/;
		// isJson = /^application\/json\b/;

	function FauxXHR (cached) {
		// initialize
		['status', 'statusText', 'responseType', 'responseText', 'headers'].forEach(function (key) {
			this[key] = cached[key];
		}.bind(this));
		// create response, if required
		var mime = this.getResponseHeader('Content-Type');
		switch (true) {
			case typeof ArrayBuffer != 'undefined' && this.responseType === 'arraybuffer':
				this.response = new ArrayBuffer(2 * this.responseText.length);
				for (var view = new Uint16Array(this.response), i = 0, n = this.responseText.length; i < n; ++i) {
					view[i] = this.responseText.charCodeAt(i);
				}
				break;
			case typeof Blob != 'undefined' && this.responseType === 'blob':
				this.response = new Blob([this.responseText], {type: mime});
				break;
			case typeof DOMParser != 'undefined' && this.responseType === 'document':
				this.response = new DOMParser().parseFromString(this.responseText, mime);
				break;
			case this.responseType === 'json':
				if ('response' in cached) {
					this.response = cached.response;
					this.responseText = JSON.stringify(this.response);
				} else {
					this.response = JSON.parse(this.responseText);
				}
				break;
			default:
				this.response = this.responseText;
				break;
		}
		this.responseXML = null;
		if (this.responseType == 'document') {
			this.responseXML = this.response;
		} else if (typeof DOMParser != 'undefined') {
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
