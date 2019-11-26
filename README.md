# `io`


[![Build status][travis-image]][travis-url]
[![NPM version][npm-image]][npm-url]

[![Greenkeeper][greenkeeper-image]][greenkeeper-url]
[![Dependencies][deps-image]][deps-url]
[![devDependencies][dev-deps-image]][dev-deps-url]

A minimal, yet flexible I/O for browser and Node with promises. A thin wrapper on top of [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest),
and [fetch()](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), with numerous callbacks to simplify and automate all aspects of I/O especially using [JSON](http://www.json.org/) as an envelope,
including to add more transports, and I/O orchestration plugin services.

It can run on Node using a specialized transport: [heya-io-node](https://github.com/heya/io-node). It greatly simplifies I/O on Node by leveraging enhanced features of `heya-io` in the server environment.

The following services are included:

* `io.cache` &mdash; a transparent application-level cache (supports [sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) and
  [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) out of the box).
* `io.bundle` &mdash; a transparent service to bundle requests into one package passing it to a server, and unbundling a result.
  It requires a simple server counterpart. [heya-bundler](https://github.com/heya/bundler) is a reference implementation for node.js/express.js.
* `io.track` &mdash; a simple plugin to track I/O requests to eliminate duplicates, register an interest without initiating I/O requests, and much more.
* `io.mock` &mdash; a way to mock I/O requests without writing a special server courtesy of [Mike Wilcox](https://github.com/clubajax). Very useful for rapid prototyping and writing tests.
* `io.bust` &mdash; a simple plugin to generate a randomized query value to bust browser's cache.
* `io.retry` &mdash; a plugin to retry unreliable services or watch changes over time.

The following additional transports are provided:

* `io.fetch()` &mdash; replaces `XHR` with `fetch()`-based transport.
* `io.jsonp()` &mdash; [JSON-P](http://json-p.org/) requests.
* `io.load()` &mdash; generates `<script>` tags to include JavaScript files.

Utilities:

* `url()` &mdash; uses ES6 tagged literals to form properly sanitized URLs.

As is `heya-io` uses the standard [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).
Given that not all browsers provide it, `heya-io` can be used with any then-able, but it was especially tested with implementations provided by [heya-async](https://github.com/heya/async):
[FastDeferred](https://github.com/heya/async/wiki/async.FastDeferred) and [Deferred](https://github.com/heya/async/wiki/async.Deferred).
With those modules an extended API is supported: I/O progress reports, and cancellation of I/O requests.

# Examples

Plain vanilla GET:

```js
heya.io.get('http://example.com/hello').then(function (value) {
  console.log(value);
});

heya.io.get('/hello', {to: 'world', times: 5}).then(function (value) {
  // GET /hello?to=world&times=5
  console.log(value);
});
```

POST a form (can include files or any other form elements):

```js
var formElement = document.querySelector('form');
heya.io.post('/form', new FormData(formElement));
```

Some other verbs ([REST](https://en.wikipedia.org/wiki/Representational_state_transfer) example):

```js
function done() { console.log('done'); }

heya.io.post('/things', {name: 'Bob', age: 42}).then(done);
heya.io.put('/things/5', {name: 'Alice', age: 33}).then(done);
heya.io.patch('/things/7', {age: 14}).then(done);
heya.io.remove('/things/3').then(done);
```

Modern browsers:

```js
const doIO = async query => {
  const result = await heya.io.get('/hello', {q: query});
  await heya.io.post('/things', {name: 'Bob', age: 42, friendly: result});
}
```

Other transports:

```js
// let's make a JSON-P call:
heya.io.jsonp('/planets', {query: 'name'}).then(function (values) {
  // GET /planets?query=name
  console.log('We have ' + values.length + ' planets:', values);
});
```

Mock:

```js
// set up a mock handler
heya.io.mock('/a*', function (options, prep) {
  console.log('Got call: ' + options.method + ' ' + prep.url);
  return 42;
});

// let's make a call
heya.io.get('/a/x').then(function (value) {
  console.log(value); // 42
});

// set up a redirect /b => /a/b
heya.io.mock('/b', function (options) {
  return heya.io.get('/a/b', options.query || options.data || null);
});

// let's make another call
heya.io.get('/b', {q: 1}).then(function (value) {
  console.log(value); // 42
});
```

Using `url` template to sanitize URLs (ES6):

```js
const client = 'Bob & Jordan & Co';
heya.io.get(url`/api/${client}/details`).then(function (value) {
  // GET /api/Bob%20%26%20Jordan%20%26%20Co/details
  console.log(value);
});
```

See more examples in the cookbooks:

* [Cookbook: main](https://github.com/heya/io/wiki/Cookbook:-main)
* Services:
  * [Cookbook: bundle](https://github.com/heya/io/wiki/Cookbook:-bundle)
  * [Cookbook: cache](https://github.com/heya/io/wiki/Cookbook:-cache)
  * [Cookbook: mock](https://github.com/heya/io/wiki/Cookbook:-mock)
  * [Cookbook: track](https://github.com/heya/io/wiki/Cookbook:-track)
* Transports:
  * [Cookbook: jsonp](https://github.com/heya/io/wiki/Cookbook:-jsonp)
  * [Cookbook: load](https://github.com/heya/io/wiki/Cookbook:-load)
  * [Cookbook: fetch](https://github.com/heya/io/wiki/Cookbook:-fetch)

# How to install

With npm:

```txt
npm install --save heya-io
```

With bower:

```txt
bower install --save heya-io
```

# How to use

`heya-io` can be installed with `npm` or `bower` with files available from `node_modules/` or `bower_components/`. By default, it uses AMD:

```js
define(['heya-io'], function (io) {
  io.get('/hello').then(function (value) {
    console.log(value);
  });
});
```

But it can be loaded with `<script>` tag from `dist/`:

```html
<script src='node_modules/heya-io/dist/io.js'></script>
```

And used with globals like in examples above:

```js
heya.io.get('/hello').then(function (value) {
  console.log(value);
});
```

To support browsers without the standard `Promise`, you may want to use [heya-async](https://github.com/heya/async).

AMD:

```js
define(['heya-io', 'heya-async/FastDeferred'], function (io, Deferred) {
  // instrument
  io.Deferred = Deferred;
  // now we are ready for all browsers
  io.get('/hello').then(function (value) {
    console.log(value);
  });
});
```

Globals:

```html
<script src='node_modules/heya-io/dist/io.js'></script>
<script src='node_modules/heya-async/dist/Micro.js'></script>
<script src='node_modules/heya-async/dist/FastDeferred.js'></script>
```

```js
// instrument
heya.io.Deferred = heya.async.FastDeferred;
// now we are ready for all browsers
heya.io.get('/hello').then(function (value) {
  console.log(value);
});
```

See [How to include](https://github.com/heya/io/wiki/How-to-include) for more details.

# Documentation

All documentation can be found in [project's wiki](https://github.com/heya/io/wiki).

# Working on this project

In order to run tests in a browser of your choice, so you can debug interactively, start the test server:

```bash
npm start
```

Then open this URL in a browser: http://localhost:3000/tests/tests.html It will show a blank screen, but the output will appear in the console of your developer tools.

The server runs indefinitely, and can be stopped by Ctrl+C.

# Versions

- 1.9.0 *Bugfixes and refactoring in the `retry` service.*
- 1.8.0 *Added `retry` service. Thx [Jason Vanderslice](https://github.com/jasonvanderslice)!*
- 1.7.1 *Refreshed dev dependencies.*
- 1.7.0 *Added `AbortRequest`.*
- 1.6.2 *Added separate `options.onDownloadProgress()` and `options.onUploadProgress()`.*
- 1.6.1 *Added extra properties to progress data.*
- 1.6.0 *Added `options.onProgress()` and tests on Firefox Puppeteer.*
- 1.5.0 *Added cache removal by a function.*
- 1.4.2 *Added `ignoreBadStatus` flag when `returnXHR`.*
- 1.4.1 *Technical release. No changes.*
- 1.4.0 *Added mocks by regular expressions and matcher functions.*
- 1.3.0 *Added cache removal by regular expressions and wildcards.*
- 1.2.6 *Bugfixes: `getHeaders()` behaves like on Node, empty object queries are supported.*
- 1.2.5 *Exposed `io.getData(xhr)` and `io.getHeaders(xhr)`.*
- 1.2.4 *Relaxed cache's detection of Result().*
- 1.2.3 *Regenerated dist.*
- 1.2.2 *Moved tests to Puppeteer, bugfixes, improved docs.*
- 1.2.1 *Added Ignore type for data processors, bugfixes.*
- 1.2.0 *Clarified DELETE, added more well-known types.*
- 1.1.7 *Refreshed dependencies.*
- 1.1.6 *Bugfix: `processFailure` could be skipped.*
- 1.1.5 *Bugfix: MIME processors. Thx [Bryan Pease](https://github.com/Akeron972)!*
- 1.1.4 *Added custom data and MIME processors.*
- 1.1.3 *Formalized requests and responses with no bodies.*
- 1.1.2 *Minor fixes for non-browser environments. New alias and verb.*
- 1.1.1 *Added `url` tagged literals (an ES6 feature).*
- 1.1.0 *Added fetch() as an alternative default transport.*
- 1.0.9 *Correcting typos in README. New version of a test server.*
- 1.0.8 *Add a helper for busting browser cache.*
- 1.0.7 *Regenerated dist.*
- 1.0.6 *Added a helper to extract data from XHR in case of errors.*
- 1.0.5 *XHR can be reinstated from a JSON object, not just a string.*
- 1.0.4 *Regenerated dist.*
- 1.0.3 *Bugfix: cache XHR object directly.*
- 1.0.2 *Fixed formatting errors in README.*
- 1.0.1 *Improved documentation.*
- 1.0.0 *The initial public release as heya-io. Sunset of heya-request. Move from bitbucket.*

# License

BSD or AFL &mdash; your choice.


[npm-image]:         https://img.shields.io/npm/v/heya-io.svg
[npm-url]:           https://npmjs.org/package/heya-io
[deps-image]:        https://img.shields.io/david/heya/io.svg
[deps-url]:          https://david-dm.org/heya/io
[dev-deps-image]:    https://img.shields.io/david/dev/heya/io.svg
[dev-deps-url]:      https://david-dm.org/heya/io?type=dev
[travis-image]:      https://img.shields.io/travis/heya/io.svg
[travis-url]:        https://travis-ci.org/heya/io
[greenkeeper-image]: https://badges.greenkeeper.io/heya/io.svg
[greenkeeper-url]:   https://greenkeeper.io/
