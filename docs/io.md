# I/O

`io` is used to communicate with servers. It is a thin wrapper over
[XHR](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)
based on promises (special fast implemenation of promises is provided with `heya-async`.
Additionally it includes a simple plugin to make [JSON-P](http://json-p.org/) calls.

It is three main purposes:

1. Provide a convenient flexible helper to code I/O requests.
2. Provide a way to customize an I/O handling to account for pecularities of a given server environment including URL rewriting,
   handling custom error envelopes, implementing application-specific retries, and so on.
3. Provide a solid foundation to orchestrate I/O (see `io-bundle`).

As such the following main API is provided:

* `io.get()` &mdash; GET a resource.
* `io.post()` &mdash; make a POST call.
* `io.put()` &mdash; make a PUT call.
* `io.patch()` &mdash; make a PATCH call.
* `io.remove()`  and `io['delete']()` &mdash; make a DELETE call.
* `io.jsonp()` &mdash; make a JSON-P call &mdash; requires a separate plugin `io-jsonp` (see its documentation for more details).

All of them are built on top of:

* `io()` &mdash; make any call using XHR.

`io` exposes various parameters to customize its behavior including join points suitable for [AOP](https://en.wikipedia.org/wiki/Aspect-oriented_programming)
and functional replacement techniques.

## The main API

### `io()`

`io(url|options)` takes a single argument, which can be a string, or an object. If it is an object, following properties can be processed:

* `url` is the only required property. It is a URL of an endpoint we deal with.

The rest of properties are all optional with reasonable defaults:

* `method` is an [HTTP method](https://tools.ietf.org/html/rfc2616#section-9) (including [PATCH](https://tools.ietf.org/html/rfc5789)) as a string. Default: 'GET'.
* `query` is a query dictionary (a key/value hash), which is used to form a query part of URL after `'?'`. Values of such dictionary can be strings,
  or arrays of strings to form multiple values with the same key. If URL already contains a query part, it is added as is without checking for duplicates. Default: none.
* `data` is a data object to send. For GET method it is assumed to be a query object, if `query` is not specified. For all other requests, it is assumed to be a payload.
  If `data` is an object of `FormData`, `ArrayBuffer`, `Blob`, or `Docyment`, it is sent as is. Otherwise, if `Content-Type` is `application/json` or missing,
  `data` is assumed to be a JSON object and stringified. In all other cases it is assumed to be a preformatted value, and send as is. Default: none.
* `headers` is a dictionary (a key/value hash), which is used to set request headers. Values of such a dictionary can be strings,
  or arrays of strings to form multiple values with the same key. Default: none, but if there is no `Accept` header, it is set to `application/json`.

The next batch of properties is directly related to an underlying [XHR request](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest):

* `user` is a user name as a string to be sent with the request. Default: not sent.
* `password` is a password as a string. It is used only if `user` is specified. Default: `''`.
* `timeout` is a [wait time](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/timeout) for a request in milliseconds as a number. Default: not set.
* `responseType` is a requested [response type](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType) as a string.
  It can be: `'json'`, `'arraybuffer'`, `'blob'`, `'document'`, `'text'`, or `''`. Essentially it defines an automatic conversion of a received response in
  [`response`](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/response) property of XHR, which is used by `io()` to return a value. Default: not set.
* `withCredentials` is a Boolean [flag for cross-origin requests](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/withCredentials). Default: not set.
* `mime` is a string used to [override a returned MIME type](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#overrideMimeType())
  in `Content-Type` response header. Default: not set.

The next batch of properties used to replace default processing of received response:

* `processSuccess(result)` is a function that receives a result object for processing and returns either a data object, or a rejected promise.
  Default: `io.processSuccess()` (see below for more details).

* `processFailure(error)` is a function that received an error object for processing, and it should return either a data object, or a rejected promise.
  It will be called when I/O was unsuccessful, or `processSuccess()` returned an error. Default: `io.processFailure()` (see below for more details).

The next batch of properties is used for an advanced processing with `io-bundle` package or similar:

* `wait` is a Boolean flag that indicates our interest in this I/O request, but we don't want to initiate it at this point. Default: false.
* `cache` is a Boolean flag that allows to use cache for this request.
* `bundle` is a Boolean flag that allows to bundle this request.

See `io-bundle` for more details on those properties, and their default values.

If a string is specified as the only argument of `io()`, it is assumed to be a URL. It will be treated as:

```js
// io(url) =>
io({
  url: url,
  method: 'GET'
})
```

`io()` returns a promise:

```js
io('http://example.com').then(
  function (data) {
    console.log('We got data:', data);
  },
  function (xhr) {
    console.log('We failed with', xhr.status, '=>', xhr.statusText);
  }
);
```

### `io.get(url|options, [query])`

`io.get()` initiates a GET request. It takes two arguments:

* `url` is a URL as a string.
* `options` is an options object described above (see `io()`).
* `query` is an optional dictionary to form a query string (see `query` above in `io()`).

Either `url` or `options` should be specified.

The returned value is a promise (see `io()` for details).

### `io.post(url|options, [data])`

`io.post()` initiates a POST request. It takes two arguments:

* `url` is a URL as a string.
* `options` is an options object described above (see `io()`).
* `data` is an optional data object (see `data` above in `io()`).

Either `url` or `options` should be specified.

The returned value is a promise (see `io()` for details).

### `io.put(url|options, [data])`

`io.put()` initiates a PUT request. Otherwise it is identical to `io.post()`.

### `io.patch(url|options, [data])`

`io.patch()` initiates a PATCH request. Otherwise it is identical to `io.patch()`.

### `io.remove(url|options, [data])`

`io.remove()` initiates a DELETE request. Otherwise it is identical to `io.post()`.

### `io['delete'](url|options, data)`

The other way to initiate a DELETE request is to call `io['delete']()`, which is less convenient than calling `io.remove()`,
becase `delete` is a reserved word in JavaScript. `io.remove()` is an alias of this function.

## Exposed properties of `io`

Following properties are available to customize all aspects of I/O handling.

### io.FailedIO

It is an object constructor used to indicate an underlying I/O error. It takes three arguments:

* `xhr` is an underlying XHR object. It can be `null` in certain cases, e.g., for JSON-P calls.
* `options` is an original `options` object, which initialized this request.
* `event` is an event object, which finished the request, and possibly provides more information about the error. It can be `null`.

All those arguments are exposed as properties on an error object.

Objects of this type is used for generic I/O errors, when XHR has failed to start. It is exposed so user can construct its own errors,
or use it with `instanceof` operator.

`io.FailedIO` is used as a base class for other `io` errors.

### io.TimedOut

It is a constructor based on `io.FailedIO` with the same arguments. It is used to indicate timeout errors.

### io.BadStatus

It is a constructor based on `io.FailedIO` with the same arguments. It is used to indicate server status errors.

### `io.makeQuery(dict)`

This function takes a key/value dictionary object and returns a correctly encoded query string. Values are assumed to be strings, or arrays of strings.
The latter are used to form multiple values with the same key.

### `io.processSuccess(result)`

It is called when I/O itself was successful. It will be called even if a server returned an error. It is its job to detect such errors and respond accordingly.

A result object has three properties:

* `xhr` is an underlying XHR object to process.
* `options` is an original `options` object, which initialized this request.
* `event` is a [load event](https://developer.mozilla.org/en-US/docs/Web/Events/load) object, which finished the request. It can be `null`.

This function is the first in the promise's `then`-chain. It performs following actions:

* If `status` is not in 2XX range, it returns a rejected promise with a valie of `io.BadStatus`. That object will have all those three properties mentioned above.
* If `responseType` was set, it will return `response` of an XHR object.
* If `responseXML` of an XHR is set, it will be returned.
* If the returned `Content-Type` is `application/json`, the received string will be parsed as a JSON object, which will be subsequently returned.
* Otherwise `responseText` of an XHR will be returned.

This function can be overwritten for individual requests in `io()`'s `options` as `processSuccess` property.

### `io.processFailure(error)`

By default an error object can be of three types:

1. `io.FailedIO`, when I/O failed to happen.
2. `io.TimedOut`, when `timeout` was specified, but I/O did not finish in a specified time.
3. `io.BadStatus`, when everything was fine, but our response indicates a logical error, such as a bad status from a server.

An error object has the same three properties as the result object of `io.processSuccess()`.

This function is the first in the promise's `catch`-chain right after `io.processSuccess()`.
It returns a rejected promise resolved to an XHR object of the failed request.
If XHR is not available (e.g., for JSON-P requests), `null` is used.

This function can be overwritten for individual requests in `io()`'s `options` as `processFailure` property.

### `io.processOptions(options)`

This function is called to transform `io()`'s `options`. Before calling this function, if `options` is a string,
it is assumed to be a URL, and new options object is formed:

```js
{
  url: url
}
```

It ensures that the argument of `io.processOPtions()` is always an object.

The default implementation returns its argument as is.

This function is exposed solely to be replaced, or augmented (AOP-style) by users to accommodate unique requirements.

### `io.processData(xhr, options, data)`

This procedure is used to configure an XHR object, and return a data object ready to be sent out. Arguments:

* `xhr` is an XHR object that will be used for a request.
* `options` is an original `options` object, which initialized this request.
* `data` is an object from `options.data` or `null`.

The default implementation performs following actions:

* Checks headers for `Accept` header. If it is not set, sets it to `application/json`.
* Checks the method. If it is GET or missing (GET is assumed), returns `null` meaning "no payload".
* If `data` is of following types: `FormData`, `ArrayBuffer`, `Blob`, or `Document`, it returns `data` as is.
* Checks headers for `Content-Type`.
  * If it is `application/json`, `data` is assumed to be JSON, it is stringified and returned.
  * If it is missing, `Content-Type` is set to `application/json`, `data` is assumed to be JSON, it is stringified and returned.
* Otherwise `data` is returned as is.

This function is exposed solely to be replaced, or augmented (AOP-style) by users to accommodate unique requirements.

### `io.request(options)`

This is the main function that actually starts an I/O request. It sets up an XHR object, forms a query string,
calls `io.processData()`, and controls a returned promise.

The only argument is `options` like in `io()` function. If it was a string (a URL), it is transformed to a minimal object as described above.
It returns a promise, which will be resolved with `result` object (see `io.processSuccess()` above for details), or `error` object
(see `io.processFailure()` for details). Both `io.processSuccess()` and `io.processFailure()` will be attached to this promise.

This function is exposed solely to be replaced, or augmented (AOP-style) by users to accommodate unique requirements.
