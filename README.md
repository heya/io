# `io`

[![Build status][travis-image]][travis-url]
[![Dependencies][deps-image]][deps-url]
[![devDependencies][dev-deps-image]][dev-deps-url]
[![NPM version][npm-image]][npm-url]

A minimal, yet flexible I/O for browser with promises. A thin wrapper on top of [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest), with numerous callbacks to simplify and automate all aspects of I/O especially using [JSON](http://www.json.org/) as an envelope, including to add more transports, and I/O orchestration plugin services.

Two additional transports are provided:

* `io.jsonp()` &mdash; [JSON-P](http://json-p.org/) requests.
* `io.load()` &mdash; generate `<script>` tags to include JavaScript files.

Four services are included:

* `io.cache` &mdash; a transparent application-level cache (supports [sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) and [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) out of the box).
* `io.bundle` &mdash; a transparent service to bundle requests into one package passing it to a server, and unbundling a result. It requires a simple server counterpart. [heya-bundler](https://www.npmjs.com/package/heya-bundler) is a reference implementation for node.js/express.js.
* `io.track` &mdash; a simple plugin to track I/O requests to eliminate duplicates, register an interest without initiating an I/O requests, and much more.
* `io.mock` &mdash; a way to mock I/O requests without writing a special server courtesy of [Mike Wilcox](https://github.com/clubajax). Very useful for rapid prototyping and writing tests.

As is `heya-io` uses the standard [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise). Given that not all browsers provide it, `heya-io` can be used with any then-able, but it was especially tested with implementations provided by [heya-async](https://www.npmjs.com/package/heya-async): [FastDeferred](https://github.com/heya/async/wiki/async.FastDeferred) and [Deferred](https://github.com/heya/async/wiki/async.Deferred). With those modules an extended API is supported: I/O progress reports, and cancellation of I/O requests.

# Examples

Plain vanilla GET:

```js
heya.io.get('http://example.com/hello').then(function (value) {
  console.log(value);
});

heya.io.get('/hello', {to: 'world', times: 5}).then(function (value) {
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

io.post('/things', {name: 'Bob', age: 42}).then(done);
io.put('/things/5', {name: 'Alice', age: 33}).then(done);
io.patch('/things/7', {age: 14}).then(done);
io.remove('/things/3').then(done);
```


Other transports:

```js
// let's make a JSON-P call:
heya.io.jsonp('/planets', {query: 'name'}).then(function (values) {
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
heya.io.get('/a/x'),then(function (value) {
  console.log(value); // 42
});

// set up a redirect /b => /a/b
heya.io.mock('/b', function (options) {
  return heya.io.get('/a/b', options.query || options.data || null);
});

// let's make another call
heya.io.get('/b', {q: 1}),then(function (value) {
  console.log(value); // 42
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

# Versions

- 1.0.2 &mdash; *Fixed formatting errors in README.*
- 1.0.1 &mdash; *Improved documentation.*
- 1.0.0 &mdash; *The initial public release as heya-io. Sunset of heya-request. Move from bitbucket.*

# License

BSD or AFL &mdash; your choice.


[npm-image]:      https://img.shields.io/npm/v/heya-io.svg
[npm-url]:        https://npmjs.org/package/heya-io
[deps-image]:     https://img.shields.io/david/heya/io.svg
[deps-url]:       https://david-dm.org/heya/io
[dev-deps-image]: https://img.shields.io/david/dev/heya/io.svg
[dev-deps-url]:   https://david-dm.org/heya/io#info=devDependencies
[travis-image]:   https://img.shields.io/travis/heya/io.svg
[travis-url]:     https://travis-ci.org/heya/io
