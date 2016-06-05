define([], function () {
	'use strict';

	// the I/O powerhouse

	function Result (xhr, options, event) { this.xhr = xhr; this.options = options; this.event = event; }
	function FailedIO () { Result.apply(this, arguments); }
	FailedIO.prototype = Object.create(Result.prototype);
	function TimedOut () { FailedIO.apply(this, arguments); }
	TimedOut.prototype = Object.create(FailedIO.prototype);
	function BadStatus () { FailedIO.apply(this, arguments); }
	BadStatus.prototype = Object.create(FailedIO.prototype);

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

	var noPayload = {GET: 1, HEAD: 1};

	function buildUrl (options) {
		var url = options.url, query = options.query, data = options.data;
		if (query) {
			query = io.makeQuery(query) || query;
		} else {
			if((!options.method || noPayload[options.method.toUpperCase()]) && data) {
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

	function xhrRequest (options, prep) {
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
		if (typeof d.progress == 'function') {
			xhr.onprogress = function (event) {
				d.progress({xhr: xhr, options: options, event: event, upload: false});
			};
			if (xhr.upload) {
				xhr.upload.onprogress = function (event) {
					d.progress({xhr: xhr, options: options, event: event, upload: true});
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
		if (!options.method || options.method == 'GET') {
			return null; // ignore payload for GET
		}
		if (data) {
			switch (true) {
				case typeof FormData != 'undefined' && data instanceof FormData:
				case typeof ArrayBuffer != 'undefined' && data instanceof ArrayBuffer:
				case typeof Blob != 'undefined' && data instanceof Blob:
				case typeof Document != 'undefined' && data instanceof Document:
					return data; // do not process well-known types
			}
		}
		var contentType = options.headers && options.headers['Content-Type'];
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

	function processSuccess (result) {
		if (!(result instanceof io.Result)) {
			return result;
		}
		if (result.xhr.status < 200 || result.xhr.status >= 300) {
			return io.Deferred.reject(new BadStatus(result.xhr, result.options, result.event));
		}
		if (result.options.returnXHR) {
			return result.xhr;
		}
		if (result.xhr.status === 204 || (result.options.method && result.options.method.toUpperCase() === 'HEAD')) {
			// no body was sent
			return; // return undefined
		}
		if (result.xhr.responseType) {
			return result.xhr.response;
		}
		if (result.xhr.responseXML) {
			return result.xhr.responseXML;
		}
		if (isJson.test(result.xhr.getResponseHeader('Content-Type'))) {
			return JSON.parse(result.xhr.responseText);
		}
		return result.xhr.responseText;
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
		return (io.transports[options.transport] || xhrRequest)(options, prep);
	}

	function makeKey (options) {
		return io.prefix + (options.method || 'GET') + '-' + io.buildUrl(options);
	}

	function prepareRequest (options) {
		var prep  = {url: buildUrl(options)};
		prep.key  = io.prefix + (options.method || 'GET') + '-' + prep.url;
		prep.data = options.data || null;
		if(!options.query && prep.data &&
				(!options.method || noPayload[options.method.toUpperCase()])) {
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

	['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].forEach(function (verb) {
		io[verb.toLowerCase()] = makeVerb(verb);
	});
	io.remove = io['delete']; // alias for simplicity


	// export

	io.Result    = Result;
	io.FailedIO  = FailedIO;
	io.TimedOut  = TimedOut;
	io.BadStatus = BadStatus;
	io.Deferred  = io.FauxDeferred = FauxDeferred;

	io.prefix    = 'io-';
	io.makeKey   = makeKey;
	io.makeQuery = makeQuery;
	io.buildUrl  = buildUrl;

	io.processOptions = processOptions;
	io.processSuccess = processSuccess;
	io.processFailure = processFailure;
	io.processData    = processData;
	io.prepareRequest = prepareRequest;

	io.transports = {};
	io.makeVerb   = makeVerb;

	io.request = request;

	io.services = [];
	io.attach   = attach;
	io.detach   = detach;

	return io;
});
