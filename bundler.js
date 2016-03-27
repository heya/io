'use strict';

var debug     = require('debug')('bundle');
var request   = require('request');
var par       = require('heya-async').par;
var promisify = require('heya-async/promisify');


var requestAsync = promisify(request, null, true);
requestAsync.original = request;


function identity (x) { return x; }


function instrumentBundle (opt) {
    var maxRequests = opt.maxRequests || 20,
        isUrlAcceptable = opt.isUrlAcceptable,
        resolveUrl = opt.resolveUrl,
        processResult = opt.processResult || identity;
    return function bundle (req, res) {
        debug('=> ' + req.method + ' ' + req.url +
              (req.body && req.body.length ? ' (payload: ' + req.body.length + ' bytes of ' + req.get('content-type') + ')' : ''));
        // no request body
        if (!req.body || !req.body.length) {
            debug('no payload');
            res.status(500).type('text/plain').send('No payload');
            return;
        }
        // wrong payload
        var payload = JSON.parse(req.body.toString());
        if (!(payload instanceof Array)) {
            debug('wrong payload');
            res.status(500).type('text/plain').send('Wrong payload');
            return;
        }
        // empty payload
        if (!payload.length) {
            debug('empty payload');
            res.json({bundle: 'bundle', results: []});
            return;
        }
        // payload is too large
        if (payload.length > maxRequests) {
            debug('large payload');
            res.status(500).type('text/plain').send('Large payload');
            return;
        }
        debug('=> RECEIVED bundle of ' + payload.length + ': ' + payload.map(function (o) { return o.url || o; }).join(', '));
        var requests = payload.map(function (options) {
                var newOptions = {}, url, query, data;
                if (typeof options == 'string') {
                    url = options;
                } else {
                    url = options.url;
                    query = options.query;
                    data = options.data;
                }
                newOptions.method = options.method || 'GET';
                // make url
                if (query) {
                    query = makeQuery(query) || query;
                } else {
                    if (newOptions.method === 'GET' && data) {
                        query = makeQuery(data);
                        data = null; // data is processed as a query, no need to send it
                    }
                }
                if (query) {
                    url += (url.indexOf('?') < 0 ? '?' : '&') + query;
                }
                if (!isUrlAcceptable(url)) {
                    return new Error('Unacceptable URL: ' + url);
                }
                newOptions.url = resolveUrl(url);
                newOptions.headers = options.headers ? Object.create(options.headers) : {};
                if (options.timeout) {
                    newOptions.timeout = options.timeout;
                }
                // process data
                if (newOptions.method !== 'GET') {
                    var contentType = newOptions.headers['Content-Type'];
                    if (!contentType) {
                        if (data && typeof data == 'string') {
                            newOptions.headers['Content-Type'] = 'application/json';
                            newOptions.body = JSON.stringify(data);
                        }
                    } else if (/^application\/json\b/.test(contentType)) {
                        newOptions.body = JSON.stringify(data);
                    }
                }
                if (!newOptions.headers.Accept) {
                    newOptions.headers.Accept = 'application/json';
                }
                newOptions.headers.Cookie = req.get('Cookie');
                debug('<= ' + newOptions.method + ' ' + url + ' => ' + newOptions.url +
                    (newOptions.body && newOptions.body.length ? ' (payload: ' + newOptions.body.length + ' bytes of ' + newOptions.headers('Content-Type') + ')' : ''));
                return newOptions;
            }),
            promises = requests.map(function (options) {
                return options instanceof Error ? options : requestAsync(options);
            });
        par(promises).then(function (results) {
            var headers;
            results = results.map(function (response, index) {
                var options = normalizeOptions(payload[index]);
                if (response instanceof Error) {
                    return {
                        options: options,
                        response: {
                            status: 500,
                            statusText: response.message,
                            responseType: '',
                            responseText: '',
                            headers: ''
                        }
                    };
                }
                var head = response[0];
                headers = head.headers;
                return processResult({
                    options: options,
                    response: {
                        status: head.statusCode,
                        statusText: head.statusMessage,
                        responseType: options.responseType || '',
                        responseText: response[1].toString(),
                        headers: makeHeaders(head.rawHeaders, options.mime)
                    }
                });
            });
            if (headers) {
                res.set(headers);
            }
            debug('<= RETURNED bundle of ' + results.length);
            res.set('Content-Type', 'application/json; charset=utf-8').json({bundle: 'bundle', results: results});
        });
    };
}


function dictToPairs (dict, processPair) {
    for(var key in dict) {
        var value = dict[key];
        if (value instanceof Array) {
            for(var i = 0; i < value.length; ++i) {
                processPair(key, value[i]);
            }
        } else {
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

function makeHeaders (rawHeaders, mime) {
    if (mime) {
        rawHeaders = rawHeaders.filter(function (value, index, array) {
            return array[index >> 1 << 1].toLowerCase() != 'content-type';
        });
        rawHeaders.push('Content-Type', mime);
    }
    return rawHeaders.reduce(function (acc, value, index) {
        return acc + (index % 2 ? ': ' : (index ? '\r\n' : '')) + value;
    }, '');
}

function normalizeOptions (options) {
    return typeof options == 'string' ? {url: options, method: 'GET'} : options;
}


module.exports = instrumentBundle;
