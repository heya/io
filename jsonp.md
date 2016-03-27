# JSON-P I/O

`io.jsonp()` is a helper to make [JSON-P](http://json-p.org/) calls based on the general infrastructure of `io()`.

## The main API

`io.jsonp()` is modelled on `io.get()`. It supports the same arguments, and returns a promise.

### `io.jsonp(url|options, [query])`

`io.jsonp()` initiates a JSON-P request by creating a script element. It takes two arguments:

* `url` is a URL as a string.
* `options` is an options object described above (see `io()`).
* `query` is an optional dictionary to form a query string (see `query` above in `io()`).

Either `url` or `options` should be specified.

The returned value is a promise (see `io()` for details).

An important part of the JSON-P standard is how to specify a parameter name of a callback function.
By default it is assumed to be `'callback'`, but it can be overwritten with `options.callback`.

`io.jsonp()` forms a unique callback name by concatenating a prefix `'__io_jsonp_callback_'` with an integer counter.
When a callback is called, or its script element has failed to load properly, the script element is removed from DOM,
and the callback name is removed from the global scope.

## Differences with `io()`

One obvious difference is the lack of an XHR object. Everywhere it is expected, `null` is used.

Following helper methods, which are defined in `io` are not used:

* `io.processData()` &mdash; we cannot send any payload.
* `io.request()` &mdash; we do not use XHR.
* `io.processSuccess()` &mdash; we don't need to extract data from XHR using different formats, because it is already provided.

Because `io.jsonp()` does not participate in the main `io` workflow, it is not affected by high-level tools like `io-bundle`.

Certain optional properties of `options` are ignored completely:

* `method` &mdash; JSON-P supports the only method: GET.
* `headers` &mdash; there is no way to define or change HTTP headers.
* `user` and `password` &mdash; unless it is encoded in a URL, a script element cannot pass a user name.
* `timeout`, `responseType`, `withCredentials`, `mime` &mdash; XHR-specific settings cannot be used.
* `wait`, `cache`, `bundle` &mdash; all advanced tools are bypassed.
* `processSuccess` &mdash; this function extracts data from XHR, while JSON-P produces data ready to use.

While XHR request can be canceled, JSON-P request cannot. No progress requests are sent out either.
