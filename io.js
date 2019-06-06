/* UMD.define */ (typeof define=="function"&&define||function(d,f,m){m={module:module,require:require};module.exports=f.apply(null,d.map(function(n){return m[n]||require(n)}))})
([], function () {
	'use strict';

	// the I/O powerhouse

	function Result (xhr, options, event) { this.xhr = xhr; this.options = options; this.event = event; }
	Result.prototype = {
		getData: function () { return io.getData(this.xhr); },
		getHeaders: function () { return io.getHeaders(this.xhr); }
	};
	function FailedIO () { Result.apply(this, arguments); }
	FailedIO.prototype = Object.create(Result.prototype);
	function TimedOut () { FailedIO.apply(this, arguments); }
	TimedOut.prototype = Object.create(FailedIO.prototype);
	function BadStatus () { FailedIO.apply(this, arguments); }
	BadStatus.prototype = Object.create(FailedIO.prototype);

	function Ignore (data) { this.data = data; }

	function FauxDeferred () {
		var resolve, reject,
			promise = new Promise(function executor (res, rej) {
				resolve = res;
				reject  = rej;
			});
		return {
			resolve: resolve,
			reject:  reject,
			promise: promise
		};
	}
	if (typeof Promise != 'undefined') {
		FauxDeferred.Promise = Promise;
		FauxDeferred.resolve = function (value) { return Promise.resolve(value); };
		FauxDeferred.reject  = function (value) { return Promise.reject(value); };
	}

	function dictToPairs (dict, processPair) {
		var i, key, value;
		for(key in dict) {
			value = dict[key];
			if(Array.isArray(value)){
				for(i = 0; i < value.length; ++i) {
					processPair(key, value[i]);
				}
			}else{
				processPair(key, value);
			}
		}
	}

	function makeQuery (dict) {
		var query = [];
		if (dict && typeof dict == 'object') {
			dictToPairs(dict, function (key, value) {
				query.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
			});
		}
		return query.join('&');
	}

	var requestHasNoBody  = {GET: 1, HEAD: 1, OPTIONS: 1, DELETE: 1},
		responseHasNoBody = {HEAD: 1, OPTIONS: 1};

	function buildUrl (options) {
		var url = options.url, query = options.query, data = options.data;
		if (query) {
			query = typeof query == 'string' ? query : io.makeQuery(query);
		} else {
			if((!options.method || requestHasNoBody[options.method.toUpperCase()]) && data) {
				query = io.makeQuery(data);
			}
		}
		if (query) {
			url += (url.indexOf('?') < 0 ? '?' : '&') + query;
		}
		return url;
	}

	function setProp (xhr, value, prop) {
		xhr[prop] = value;
	}

	var propHandlers = {
			timeout: setProp,
			responseType: setProp,
			withCredentials: setProp,
			mime: function (xhr, value) {
				xhr.overrideMimeType(value);
			},
			headers: function (xhr, value) {
				dictToPairs(value, function (key, val) {
					xhr.setRequestHeader(key, val);
				});
			}
		},
		whiteListedProps = Object.keys(propHandlers);

	function xhrTransport (options, prep) {
		var xhr = new XMLHttpRequest(),
			d = new io.Deferred(function () {
				// canceller
				xhr.abort();
			});
		// add event listeners
		xhr.onload = function (event) {
			d.resolve(new io.Result(xhr, options, event), true);
		};
		xhr.onerror = function (event) {
			d.reject(new io.FailedIO(xhr, options, event), true);
		};
		xhr.ontimeout = function (event) {
			d.reject(new io.TimedOut(xhr, options, event), true);
		};
		var dFlag = typeof d.progress == 'function', oFlag = typeof options.onProgress == 'function';
		if (oFlag || dFlag) {
			xhr.onprogress = function (event) {
				var p = {xhr: xhr, options: options, event: event, upload: false};
				oFlag && options.onProgress(p);
				dFlag && d.progress(p);
			};
			if (xhr.upload) {
				xhr.upload.onprogress = function (event) {
					var p = {xhr: xhr, options: options, event: event, upload: true};
					oFlag && options.onProgress(p);
					dFlag && d.progress(p);
				};
			}
		}
		// build a URL
		var url = prep.url;
		// open a connection
		if ('user' in options) {
			xhr.open(options.method || 'GET', url, true, options.user || '', options.password || '');
		} else {
			xhr.open(options.method || 'GET', url, true);
		}
		// set properties, if any
		whiteListedProps.forEach(function (key) {
			if (key in options) {
				propHandlers[key](xhr, options[key], key);
			}
		});
		// send data, if any
		xhr.send(io.processData(xhr, options, prep.data));
		return d.promise || d;
	}

	var isJson = /^application\/json\b/;

	function processData (xhr, options, data) {
		if (!options.headers || !options.headers.Accept) {
			xhr.setRequestHeader('Accept', 'application/json');
		}
		if (!options.method || requestHasNoBody[options.method]) {
			return null; // ignore payload for certain verbs
		}
		if (data && typeof data == 'object') {
			for (var i = 0; i < io.dataProcessors.length; i += 2) {
				if (data instanceof io.dataProcessors[i]) {
					data = io.dataProcessors[i + 1](xhr, options, data);
					break;
				}
			}
		}
		if (data instanceof Ignore) return data.data;
		var contentType = options.headers && options.headers['Content-Type'];
		if (data) {
			switch (true) {
				case typeof Document != 'undefined' && data instanceof Document:
				case typeof FormData != 'undefined' && data instanceof FormData:
				case typeof URLSearchParams != 'undefined' && data instanceof URLSearchParams:
				case typeof Blob != 'undefined' && data instanceof Blob:
					return data; // do not process well-known types
				case typeof ReadableStream != 'undefined' && data instanceof ReadableStream:
				case typeof ArrayBuffer != 'undefined' && data instanceof ArrayBuffer:
				case typeof Int8Array != 'undefined' && data instanceof Int8Array:
				case typeof Int16Array != 'undefined' && data instanceof Int16Array:
				case typeof Int32Array != 'undefined' && data instanceof Int32Array:
				case typeof Uint8Array != 'undefined' && data instanceof Uint8Array:
				case typeof Uint16Array != 'undefined' && data instanceof Uint16Array:
				case typeof Uint32Array != 'undefined' && data instanceof Uint32Array:
				case typeof Uint8ClampedArray != 'undefined' && data instanceof Uint8ClampedArray:
				case typeof Float32Array != 'undefined' && data instanceof Float32Array:
				case typeof Float64Array != 'undefined' && data instanceof Float64Array:
				case typeof DataView != 'undefined' && data instanceof DataView:
					!contentType && xhr.setRequestHeader('Content-Type', 'application/octet-stream');
					return data;
			}
		}
		if (!contentType) {
			if (data && typeof data == 'object') {
				xhr.setRequestHeader('Content-Type', 'application/json');
				return JSON.stringify(data);
			}
		} else if (isJson.test(contentType)) {
			return JSON.stringify(data);
		}
		return data;
	}

	function processOptions (options) {
		return options;
	}

	function getData (xhr) {
		if (!xhr) return; // return undefined
		if (xhr.status === 204) {
			// no body was sent
			return; // return undefined
		}
		if (xhr.responseType) {
			return xhr.response;
		}
		var contentType = xhr.getResponseHeader('Content-Type');
		mimeLoop: for (var i = 0; i < io.mimeProcessors.length; i += 2) {
			var mime = io.mimeProcessors[i], result;
			switch (true) {
				case mime instanceof RegExp && mime.test(contentType):
				case typeof mime == 'function' && mime(contentType):
				case typeof mime == 'string' && mime === contentType:
					result = io.mimeProcessors[i + 1](xhr, contentType);
					if (result !== undefined) {
						return result;
					}
					break mimeLoop;
			}
		}
		if (xhr.responseXML) {
			return xhr.responseXML;
		}
		if (isJson.test(xhr.getResponseHeader('Content-Type'))) {
			return JSON.parse(xhr.responseText);
		}
		return xhr.responseText;
	}

	function processSuccess (result) {
		if (!(result instanceof io.Result)) {
			return result;
		}
		if ((!result.options.returnXHR || !result.options.ignoreBadStatus) && (result.xhr.status < 200 || result.xhr.status >= 300)) {
			return io.Deferred.reject(new io.BadStatus(result.xhr, result.options, result.event));
		}
		if (result.options.returnXHR) {
			return result.xhr;
		}
		if (result.options.method && responseHasNoBody[result.options.method.toUpperCase()]) {
			// no body was sent
			return; // return undefined
		}
		return io.getData(result.xhr);
	}

	function processFailure (failure) {
		return io.Deferred.reject(failure);
	}

	function io (options) {
		// options.url - a URL endpoint
		// options.method? - a verb like GET, POST, PUT, and so on. Default: GET
		// options.query? - an optional query dictionary. Default: none.
		// options.data? - a data object to send. Default: null.
		// options.headers? - a dictionary of headers. Default: null.
		// options.user? - a user. Default: not sent.
		// options.password? - a password. Default: not sent.
		// options.timeout? - a wait time in ms. Default: not set.
		// options.responseType? - 'arraybuffer', 'blob', 'json', 'document', 'text', or ''. Default: not set.
		// options.withCredentials? - a Boolean flag for cross-site requests. Default: not set.
		// options.mime? - a string. If present, overrides a MIME type. Default: not set.
		// options.wait? - a Boolean flag to indicate our interest in a request without initiating it. Default: false.
		// options.mock? - a Boolean flag to opt-in/out in mocking. Default: as set in io.mock.defaultOptIn.
		// options.track? - a Boolean flag to opt-in/out in tracking. Default: as set in io.track.defaultOptIn.
		// options.cache? - a Boolean flag to opt-in/out in caching. Default: as set in io.cache.defaultOptIn.
		// options.bundle? - a Boolean flag to opt-in/out of bundling. Default: as set in io.bundle.defaultOptIn.
		// options.returnXHR -  a Boolean flag to return an XHR object instead of a decoded data, if available.
		// options.processSuccess - a function to extract a value for a successful I/O. Default: io.processSuccess.
		// options.processFailure - a function to extract a value for a failed I/O. Default: io.processFailure.

		switch (typeof options) {
			case 'string':
				options = {url: options, method: 'GET'};
				break;
			case 'object':
				break;
			default:
				return io.Deferred.reject(new Error('IO: a parameter should be an object or a string (url).'));
		}

		options = io.processOptions(options);

		return io.request(options).
			then(options.processSuccess || io.processSuccess).
			catch(options.processFailure || io.processFailure);
	}


	// services

	// Service is represented by an object with three properties:
	// name - a unique id of a service
	// priority - a number indicating a priority, services with higher priority
	//   will be called first. A range of 0-100 is suggested.
	// callback(options, prep, level) - a function called in the context of
	//   a service structure. It should return a correctly formed promise,
	//   or a falsy value to indicate that the next service should be tried.

	function byPriority (a, b) { return a.priority - b.priority; }

	function attach (service) {
		io.detach(service.name);
		io.services.push(service);
		io.services.sort(byPriority);
	}

	function detach (name) {
		for (var s = io.services, i = 0; i < s.length; ++i) {
			if (s[i].name === name) {
				s.splice(i, 1);
				break;
			}
		}
	}

	function request (options, prep, level) {
		prep = prep || io.prepareRequest(options);
		for (var s = io.services, i = Math.min(s.length - 1, isNaN(level) ? Infinity : level); i >= 0; --i) {
			var result = s[i].callback(options, prep, i);
			if (result) {
				return result;
			}
		}
		return (io.transports[options.transport] || io.defaultTransport)(options, prep);
	}

	function makeKey (options) {
		return io.prefix + (options.method || 'GET') + '-' + io.buildUrl(options);
	}

	function prepareRequest (options) {
		var prep  = {url: io.buildUrl(options)};
		prep.key  = io.prefix + (options.method || 'GET') + '-' + prep.url;
		prep.data = options.data || null;
		if(!options.query && prep.data &&
				(!options.method || requestHasNoBody[options.method.toUpperCase()])) {
			prep.data = null; // we processed it as a query, no need to send it
		}
		return prep;
	}


	// convenience methods

	function makeVerb (verb, method) {
		return function (url, data) {
			var options = typeof url == 'string' ? {url: url} : Object.create(url);
			options[method || 'method'] = verb;
			if (data) {
				options.data = data;
			}
			return io(options);
		};
	}

	var noDups = {age: 1, authorization: 1, 'content-length': 1, 'content-type': 1, etag: 1, expires: 1, from: 1, host: 1, 'if-modified-since': 1,
		'if-unmodified-since': 1, 'last-modified': 1, location: 1, 'max-forwards': 1, 'proxy-authorization': 1, referer: 1, 'retry-after': 1, 'user-agent': 1};
	function getHeaders (xhr) {
		var headers = {};
		if (!xhr || typeof xhr.getAllResponseHeaders != 'function') return headers;
		var rawHeaders = xhr.getAllResponseHeaders();
		if (!rawHeaders) return headers;
		rawHeaders.split('\r\n').forEach(function (line) {
			var header = /^\s*([\w\-]+)\s*:\s*(.*)$/.exec(line);
			if (!header) return;
			var key = header[1].toLowerCase(), value = headers[key];
			if (key === 'set-cookie') {
				if (!(value instanceof Array)) headers[key] = [];
				headers[key].push(header[2]);
			} else if (typeof value == 'string') {
				headers[key] = noDups[key] ? header[2] : (value + ', ' + header[2]);
			} else {
				headers[key] = header[2];
			}
		});
		return headers;
	}



	['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].forEach(function (verb) {
		io[verb.toLowerCase()] = makeVerb(verb);
	});
	io.del = io.remove = io['delete']; // alias for simplicity


	// export

	io.Result    = Result;
	io.FailedIO  = FailedIO;
	io.TimedOut  = TimedOut;
	io.BadStatus = BadStatus;
	io.Deferred  = io.FauxDeferred = FauxDeferred;
	io.Ignore    = Ignore;

	io.prefix     = 'io-';
	io.makeKey    = makeKey;
	io.makeQuery  = makeQuery;
	io.buildUrl   = buildUrl;
	io.getHeaders = getHeaders;
	io.getData    = getData;
	io.makeVerb   = makeVerb;

	io.processOptions = processOptions;
	io.processSuccess = processSuccess;
	io.processFailure = processFailure;
	io.processData    = processData;
	io.prepareRequest = prepareRequest;
	io.dataProcessors = [];
	io.mimeProcessors = [];

	io.defaultTransport = io.xhrTransport = xhrTransport;
	io.transports = {};

	io.request = request;

	io.services = [];
	io.attach   = attach;
	io.detach   = detach;

	return io;
});
