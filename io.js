define([], function () {
	'use strict';

	// the I/O powerhouse
	// depends on: Deferred

	function FailedIO (xhr, options, event) { this.xhr = xhr; this.options = options; this.event = event; }
	function TimedOut () { FailedIO.apply(this, arguments); }
	TimedOut.prototype = Object.create(FailedIO.prototype);
	function BadStatus () { FailedIO.apply(this, arguments); }
	BadStatus.prototype = Object.create(FailedIO.prototype);

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

	function buildUrl (options) {
		var url = options.url, query = options.query, data = options.data;
		if (query) {
			query = io.makeQuery(query) || query;
		} else {
			if((!options.method || options.method.toUpperCase() == 'GET') && data) {
				query = io.makeQuery(data);
				data = null; // we processed it as a query, no need to send it
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

	function request (options) {
		var xhr = new XMLHttpRequest(),
			d = new io.Deferred(function () {
				// canceller
				xhr.abort();
			});
		// add event listeners
		xhr.onload = function (event) {
			d.resolve({xhr: xhr, options: options, event: event});
		};
		xhr.onerror = function (event) {
			d.reject(new FailedIO(xhr, options, event));
		};
		xhr.ontimeout = function (event) {
			d.reject(new TimedOut(xhr, options, event));
		};
		xhr.onprogress = function (event) {
			d.progress({xhr: xhr, options: options, event: event, upload: false});
		};
		if (xhr.upload) {
			xhr.upload.onprogress = function (event) {
				d.progress({xhr: xhr, options: options, event: event, upload: true});
			};
		}
		// build a URL
		var url = io.buildUrl(options);
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
		var data = options.data || null;
		if(!options.query && (!options.method || options.method.toUpperCase() == 'GET') && data) {
			data = null; // we processed it as a query, no need to send it
		}
		xhr.send(io.processData(xhr, options, data));
		return d.promise;
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
		if (result.xhr.status < 200 || result.xhr.status >= 300) {
			return io.Deferred.reject(new BadStatus(result.xhr, result.options, result.event));
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
		// options.cache? - a Boolean flag to opt-in/out in caching. Default: as set in io.bundle.defaultOptIn.
		// options.bundle? - a Boolean flag to opt-in/out of bundling. Default: as set in io.bundle.defaultOptIn.
		// options.processSuccess - a function to extract a value for a successful I/O. Default: io.processSuccess.
		// options.processFailure - a function to extract a value for a failed I/O. Default: io.processFailure.

		switch (typeof options) {
			case 'string':
				options = {url: options};
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

	// convenience methods

	function makeVerb (verb) {
		io[verb.toLowerCase()] = function (url, data) {
			var options = typeof url == 'string' ? {url: url} : Object.create(url);
			options.method = verb;
			if (data) {
				options.data = data;
			}
			return io(options);
		};
	}

	['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].forEach(makeVerb);
	io.remove = io['delete']; // alias for simplicity

	// export

	io.FailedIO  = FailedIO;
	io.TimedOut  = TimedOut;
	io.BadStatus = BadStatus;

	io.makeQuery = makeQuery;
	io.buildUrl  = buildUrl;

	io.processOptions = processOptions;
	io.processSuccess = processSuccess;
	io.processFailure = processFailure;
	io.processData = processData;
	io.request = request;

	return io;
});
