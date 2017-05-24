(function(_,f){f(window.heya.io,window.heya.io.FauxXHR);})
(['./io', './FauxXHR'], function (io, FauxXHR) {
	'use strict';

	// fetch() handler
	// This is a browser-only module.

	var isJson = /^application\/json\b/;

	function fetchTransport (options, prep) {
		var headers = new Headers(options.headers || {}),
			req = {
				method: options.method,
				mode: typeof options.fetchMode == 'string' || io.fetch.defaultMode,
				cache: typeof options.fetchCache == 'string' || io.fetch.defaultCache,
				redirect: typeof options.fetchRedirect == 'string' || io.fetch.defaultRedirect,
				referrer: typeof options.fetchReferrer == 'string' || io.fetch.defaultReferrer,
				referrerPolicy: typeof options.fetchReferrerPolicy == 'string' || io.fetch.defaultReferrerPolicy,
				credentials: typeof options.fetchCredentials == 'string' || (('withCredentials' in options) &&
					(options.withCredentials ? 'include' : 'same-origin')) || io.fetch.defaultCredentials
			}, response;
		if (options.fetchIntegrity) req.integrity = options.fetchIntegrity;
		req.body = io.processData({setRequestHeader: function (key, value) {
			headers.append(key, value);
		}}, options, prep.data);
		if (typeof Document !== 'undefined' && req.body instanceof Document) {
			if (!headers.has('Content-Type')) {
				headers.append('Content-Type', 'application/xml');
			}
			req.body = new XMLSerializer().serializeToString(req.body);
		}
		req.headers = headers;
		return fetch(prep.url, req).catch(function (err) {
			return Promise.reject(new io.FailedIO(null, options, err));
		}).then(function (res) {
			response = res;
			return res.text();
		}).then(function (body) {
			return new io.Result(new FauxXHR({
				status: response.status,
				statusText: response.statusText,
				headers: getAllResponseHeaders(response.headers, options.mime),
				responseType: options.responseType,
				responseText: body
			}), options);
		});
	}

	io.fetch = {
		attach: attach,
		detach: detach,
		// defaults
		defaultMode: 'cors',
		defaultCache: 'default',
		defaultRedirect: 'follow',
		defaultReferrer: 'client',
		defaultReferrerPolicy: 'no-referrer-when-downgrade',
		defaultCredentials: 'same-origin'
	};

	return io;

	var oldTransport;

	function attach () {
		if (io.defaultTransport !== fetchTransport) {
			oldTransport = io.defaultTransport;
			io.defaultTransport = fetchTransport;
			return true;
		}
		return false;
	}

	function detach () {
		if (oldTransport && io.defaultTransport === fetchTransport) {
			io.defaultTransport = oldTransport;
			oldTransport = null;
			return true;
		}
		return false;
	}

	function getAllResponseHeaders (headers, mime) {
		try {
			var h = [];
			if (mime) {
				for (var pair of headers) {
					if (pair[0].toLowerCase() !== 'content-type') {
						h.push(pair[0] + ': ' + pair[1]);
					}
				}
				h.push('Content-Type: ' + mime);
			} else {
				for (var pair of headers) {
					h.push(pair[0] + ': ' + pair[1]);
				}
			}
			return h.join('\n');
		} catch (e) {
			// suppress
		}
		return headers.has('Content-Type') ? 'Content-Type: ' + headers.get('Content-Type') : '';
	}
});
