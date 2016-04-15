# Cache and bundler for I/O

`io.bundle` provides high-level tools to orchestrate I/O:

* Watch for I/O requests in progress.
  * If there is a request for a resource already requested, but not received yet, do not initiate a new I/O request, but wait for the first one to be completed.
* Provide an application-level cache.
  * If there is a request for a resource already in cache, return it, instead of initiating a new I/O request.
  * This cache is different from browser cache, and governed solely by an application logic.
* Bundle several requests in one transparently.
  * A bundle is transferred as one, receives a response, which is unbundled transparently too. User should not modify their code.
  * Bundling can be done using a time window, e.g., 40 milliseconds.
  * All current subscribers for a resource (who submitted `io()` requests for it) will be notified on unbundling.
    Additionally results can be cached, so future requests can be satisfied immediately.
    It provides a foundation to request resources ahead of time.
  * User can request a resource and supply an additional bunch for related resources, which can be cached for future use.
  * A simple request can return a bundle, which will be stored in cache for future use.
  * Pre-fetching: provisions are made to facilitate data requests before loading any JavaScript libraries to improve web pages' time-to-be-useful greatly.

In order to use bundling, a simple server-side code is required. A reference implementation in JavaScript is provided.

## Why bundle?

I/O is a major bottleneck of web applications. Every request incurs penalties including:

* DNS lookup (expensive, but ammortized after the first access).
* Establishing a connection (ammortized by HTTP/1.1 by reuse a connection).
* Network lag for every single I/O action (especially suffered by mobile users).
* Compression inefficiency (when similar payload compressed separately).

On top of that browsers restrict a number of active I/O requests per host to 2-8 depending on a browser
(see for example [Maximum concurrent connections to the same domain for browsers](http://sgdev-blog.blogspot.com/2014/01/maximum-concurrent-connection-to-same.html)).
Additionally different protocols may have more restrictions.

Spreading requests across multiple hosts are not always possible, and incurs an overhead of an additional DNS lookup, which is an expensive procedure.

These problems are not new and there are numerous strategies to deal with them. But almost all of them assume that we are dealing with static resources.
We know how to:

* Bundle like resources for better compression and to reduce a number of I/O requests:
  * Concatenate CSS together.
  * Concatenate JavaScript together.
  * Create sprites for images.
* Minify them:
  * Minify CSS.
  * Minify JavaScript.
  * Use advanced compression techniques for images, e.g., using [Zopfli](https://en.wikipedia.org/wiki/Zopfli) for
    [PNG](https://en.wikipedia.org/wiki/Portable_Network_Graphics) images,
    or providing [WebP](https://en.wikipedia.org/wiki/WebP), or [JPEG XR](https://en.wikipedia.org/wiki/JPEG_XR) formats.

But all these techniques are rarely applicable for dynamic server responses.

The upcoming [HTTP/2](https://en.wikipedia.org/wiki/HTTP/2) can solve many problems, especially with its [Server Push](https://en.wikipedia.org/wiki/Push_technology).
But we are a few years away from its full acceptance, when the general internet infrastructure (especially proxy and cache servers) will support it.
And even with HTTP/2 in place we still can leverage some application-specific intelligence as well as generic web application patterns.

Generally on the client side we have two contradictory trends:

1. Requesting all data at once reduces number of I/O requests, yet suitable more for monolithic applications.
   While individual components can pick pieces of common data, it is starts to get out of hand, when they want to update,
   or refresh relevant pieces separately.
2. Splitting a web application on manageable components, makes for better design, but almost inevitably increases a number
   of small I/O requests, or introduces an awkward API to fetch/store data.

In order to speed up a web application the following architecture is introduced:

* A server provides a bundler service, which accepts a list of requests from a client, runs them on its behalf in parallel locally,
  collects results in a bundle, and sends it back as whole.
  * For security reasons a size of bundle is restricted, all URLs are verified against a whitelist, and can be rejected.
* A client can collect and submit I/O requests as bundles.
  * The request bundle can be better compressed than individual requests.
* A client can receive a bundled response and unbundle it.
  * The response bundle can be better compressed than individual responses.
* All responses can be stored in an application-level cache for future use.
  * This provision can be used as the Server Push technique, when resources can be submitted to a client ahead of time.

In general, bundling reduces a number of required I/O requests to fetch dynamically generated server responses, provides more opportunities for enhanced compression,
and reduces lag by collecting data at a server level (hopefully using fast internal connections right in a data center) rather than remotely.

An application-level cache opens up even more opportunities to speed things up:

* Data requests and bundles can be issued before even loading any JavaScript library, making data ready when a web application just started to initialize.
* Special endpoints can be created that return a bundle when requested to populate the cache in advance before individual data requests even made.

Future versions of a bundler, or custom bundlers, can incorporate more complex techniques, like issuing requests depending on results of other requests
without round-tripping to a client.

`io-bundle` defines a simple protocol to exchange bundles, and provides a reference implementation in JavaScript for [Express](http://expressjs.com/).

## The main API

It is exactly the same as for `io()`. See there for details.

## Exposed properties of `io.bundle`

Following properties are available to customize all aspects of the advanced I/O handling.

### `io.bundle.attach()`

This procedure attaches `io.bundle` functionality to the `io` machinery. It has no arguments, and returns no meaningful value.

### `io.bundle.detach()`

This procedure tries to detach `io.bundle` from the `io` machinery. Even if it doesn't succeed, it will work in a pass-through mode.
It has no arguments, and returns no meaningful value.

### `io.bundle.isAttached()`

This function has no arguments and returns a Boolean value: `true` if `io.bundle` is enabled, and `false` otherwise.

### `io.bundle.defaultCache`

This property defines how to handle requests, whose `options` do not specify `cache` property explicitly. Effectively it defines what the default is.

It can be:

* Boolean value:
  * `true` to handle all I/O requests as cacheable by default.
  * `false` to handle all I/O requests as non-cacheable by default.
* Function that accepts `options` and returns a Boolean value treated as described above.

By default it is a function that returns `true` for all GET requests, and `false` for all other methods.

### `io.bundle.defaultBundle`

This property defines how to handle requests, whose `options` do not specify `bundle` property explicitly. Effectively it defines what the default is.

It can be:

* Boolean value:
  * `true` to handle all I/O requests as bundleable by default.
  * `false` to handle all I/O requests as non-bundleable by default.
* Function that accepts `options` and returns a Boolean value treated as described above.

By default it is a function that returns `true` for all GET requests, and `false` for all other methods.

### `io.bundle.canBeCached()`

This property is a function that takes `options` and returns `true` to cache the result, and `false` otherwise.

The default implementation performs following actions:

* Checks `cache` property for presence, and returns it, if it is specified.
* Checks if `io.bundle.defaultCache` is a function.
  * If it is, calls it with `options` and returns its result.
  * Otherwise returns its value.

**Important**: if a request cannot be cached, cache is not checked for previously cached value either.

### `io.bundle.canBeBundled()`

This property is a function that takes `options` and returns `true` to cache the result, and `false` otherwise.

The default implementation performs following actions:

* Checks `bundle` property for presence, and returns it, if it is specified.
* Checks if `io.bundle.defaultBundle` is a function.
  * If it is, calls it with `options` and returns its result.
  * Otherwise returns its value.

### `io.bundle.inspect()`

This property defines a function that takes `options` and returns a promise or `null`. The former means that a request was handled externally.
The latter means that a request was not handled, and we can proceed with a standard handling.

This function is called only for bundleable requests.

By default it returns `null`.

### `io.bundle.prefix`

This property is related to cache. It defines what string prefix to use when creating a cache key. Default: `'io-'`.

### `io.bundle.makeKey()`

This property is related to cache. It defines a function that takes `options` and returns a cache key as a string.

The default concatenates `io.bundle.prefix` value with a method name, dash, and a url.

For example, when requesting `http://example.com/` with GET, it will produce a following cache key: `'io-GET-http://example.com/'`.

**Important**: a cache key used internally for map an I/O request to other internal structures. It is not restricted to be used for cache only.

### `io.bundle.makeStorageCache()`

This property is related to cache. It defines a helper function to create a cache object based on
[Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API): either
[`sessionStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) or
[`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

It takes a string (either `'sessiobStorage'` or `'localStorage'`), and return a conformant cache object (see `io.bundle.cache` for more details).

### `io.bundle.cache`

This property is related to cache. It defines an object to use when caching requests. The object should provide follwoing methods:

* `retrieve(key)` &mdash; retrieves a value as string by a string key.
* `store(key, data)` &mdash; stores (overrides, if required) a string value by a string key.
* `remove(key)` &mdash; removes an item from cache by a string key.
* `clear()` &mdash; clears the whole cache.

By default it is an object created by calling `io.bundle.makeStorageCache('sessionStorage')`.

### `io.bundle.remove()`

This property is related to cache. It defines a procedure to remove a result of an I/O request. Its only argument is `options`.

By default it performs folowing actions:

* Transforms `options` to an object, if necessary.
* Transforms `options` with `io.processOptions()`.
* Creates a key using `io.bundle.makeKey()`.
* Removes a result by calling `io.bundle.cache.remove()`.

### `io.bundle.url`

This property is related to bundling. It defines a URL where to send bundles. Default: `'/bundle'`.

### `io.bundle.minSize`

This property is related to bundling. It defines a minimal bundle size as a number. Any bundle less than this number will be disassembled
and all requests will be issued individually as is. Default: 2.

The default value bundles 2 requests and more together, but sends individual requests as is. If we want to send all requests as bundles,
we can set it to 1.

### `io.bundle.maxSize`

This property is related to bundling. It defines a maximal bundle size as a number. If we have more requests, they will be sent out in different bundles
up to the maximal size. Default: 20.

Why do we need an upper limit on bundles? A server-side implementation of a bundler implements an upper limit for security considerations:
even if we can verify a source of bundles, having no limit, or very high limit, opens us to a [DOS attack](https://en.wikipedia.org/wiki/Denial-of-service_attack).
While DOS is possible with regular requests, and we know how to handle those, a bundler can serve as a multiplier, and requires a special care
like putting an upper limit on a bundle.

Keep in mind that `io.bundle.maxSize` should correspond to an actual restriction on a server side. While we can send bigger bundles,
they will be rejected by a server, and we don't want that.

### `io.bundle.start()`

This property is related to bundling. It starts collecting a bundle: all eligible requests will be queued until `io.bundle.commit()` is called.

### `io.bundle.commit()`

This property is related to bundling. It finishes collecting a bundle: all collected requests are assembled in bundles, and sent to a bundler.

### `io.bundle.isStarted()`

This property is related to bundling. It is a function that takes no arguments, and returns a Boolean value: `true` if we are collecting a bundle now, `false` otherwise.

### `io.bundle.waitTime`

This property is related to bundling. It defines a number of milliseconds to wait before issuing any I/O requests and collect a bundle. Default: 20.

If it is 0, no time-based bundle collection takes place. Any other value causes the following behavior:

* The first I/O request that is eligible for bundling (see `io.bundle.canBeBundled()`) issues `io.bundle.start()`, which places it in a queue.
* A timer is started for `io.bundle.waitTime` milliseconds.
* While the timer is active, all eligible I/O requests go to the queue.
* When the timer is expired, `io.bundle.commit()` is issued, all collected requests are properly bundled, and issued.

**Important**: the bigger `io.bundle.waitTime`, the more I/O requests can be collected for bundling. But remember to avoid pitfalls:

* The bigger the wait time, the bigger the delay before issuing a bundle. For example, if we wait for 10 seconds,
  it means that our first I/O request will be delayed by 10 whole seconds. It is very likely that instead of a speed up we got ourselves a massive delay.
* Usually an application issues a limited amout of I/O requests before staring to wait for responses. It means that starting from a certain moment increasing
  the wait time will fail to collect more requests slowing down our application needlessly.

In many cases we want to collect requests made during a current thread. If this is a case, consider issuing `io.bundle.start()` and `io.bundle.commit()` with
`heya-defer` facilities.

### `io.bundle.detect()`

This property is related to unbundling. It defines a function that receives a data object as a single argument, and returns an array of responces for
unbundling, or `null`.

The default implementation does following actions:

* Checks if it is non-`null` object.
* Checks if it complies to the bundle protocol:
  * Checks if there is a property named `bundle`, which value is `'bundle'`.
  * Checks if there is a property named `results`, and it is an array.
* If everything checks out, it returns `results` property.
* Otherwise, `null` is returned.

### `io.bundle.submit()`

It is a helper. This property defines a procedure that submits a bundle. It returns no value, and takes a single argument: an array of `options`.

If we already collecting a bundle (see `io.bundle.isStarted()` above), it adds to a bundle. Otherwise it opens a bundle with
`io.bundle.start()`, submits all `options`, and commits a bundle immediately with `io.bundle.commit()`.

### `io.bundle.submitWithRelated()`

It is a helper. This property defines a function that submits a request with a related bundle. It takes two arguments:

* `options` &mdash; the standard `options` object for a main request.
* `bundle` &mdash; an array of `options` for a supplimental bundle.

It returns a promise for the main request.

### `io.bundle.fly()`

This property is related to pre-fetching. This property defines a procedure that registers a bundle as being in progress without initiating actual requests.
It returns no value, and takes one argument: a bundle as an array of `options`.

### `io.bundle.unbundle()`

This property is related to unbundling. It defines a procedure that returns no value, and takes one argument: a data object. That data object is checked with
`io.bundle.detect()`, and if it recognized as a bundle response, it is unbundled, all waiting subscribers are notified, and results are cached for future use.

## The cook book

In order to use `io.bundle` make sure that following files are included in the following order:

* `io.js`
* `FauxXHR.js`
* `bundle.js`

After that `io.bundle` should be enabled:

```js
// set custom properties (can be done at any time)
io.bundle.waitTime = 30; // ms
io.bundle.url = '/custom/bundle'; // URL for a bundler

// activate the package
io.bundle.attach();
```

### Time-based bundling

By default bundles are formed within 20ms window. That's probably enough to capture all I/O requests issued on a current execution thread,
and even requests that delayed by DOM layout events. Just enable `io.bundle`, and it should start working.

```js
io.bundle.attach();
// ...

// now we can collect requests

// ...
io.get(url1).then(/* ... */).done(/* ... */);

// ...
io.get(url2).done(/* ... */);

// ...
io.get(url3).done(/* ... */);

// all three requests will be sent as one bundle
```

### Explicit bundling

If we know when we issue requests, we can opt in for an explicit collecting of bundles:

```js
io.bundle.waitTime = 0; // turn off a time-based bundle collection
io.bundle.attach();
// ...

// now we can collect requests

io.bundle.start();  // start collecting a bundle
initStuff();              // this procedure can issue I/O requests
io.bundle.commit(); // stop collecting and send out a bundle
```

If we actually know what requests we want to issue, we can make it even easier:

```js
io.bundle.waitTime = 0; // turn off a time-based bundle collection
io.bundle.attach();
// ...

io.bundle.submit([url1, url2, url3]);
```

### `heya-defer`-based bundling

Time-based bundling introduces a necessary delay, when a bundle is collected. If we want to reduce it as much as possible,
and we are fine with collecting requests only from a current execution thread, we may use `heya-defer` for that:

```js
io.bundle.waitTime = 0; // turn off a time-based bundle collection

// let's attach our alternative bundling mechanism to inspect()
var oldInspect = io.bundle.inspect;
io.bundle.inspect = function (options) {
  var promise = oldInspect(options);
  if (promise) {
    return promise;
  }
  if (!io.bundle.isStarted()) {
    io.bundle.start();
    defer.asap(function () {
      io.bundle.commit();
    });
  }
  return null;
};

io.bundle.attach();
// ...

// now we can collect requests

// ...
io.get(url1).then(/* ... */).done(/* ... */);

// ...
io.get(url2).done(/* ... */);

// ...
io.get(url3).done(/* ... */);

// all three requests will be sent as one bundle
```

### Pre-fetching

We can issue a bundle request before actually loading any JavaScript library. This way we shifted a data acquisition way forward,
so our code will wait less, or, potentially, data will be ready by the time we can consume it.

```html
<!doctype html>
<html>
  <head>
    <!-- meta information goes here -->
    <script>
      'use strict';
      // data ahead section
      (function () {
        // put forward a bundle
        var xhr = new XMLHttpRequest();
        xhr.onload = function () {
          var data = JSON.parse(xhr.responseText);
          if (window.heya && heya.io && heya.io.bundle) {
            // if io.bundle is ready, use it to unbundle
            heya.io.bundle.unbundle(data);
          } else {
            // otherwise store it for future unbundling
            window.__io_initial_bundle = data;
          }
          // no need to fly() the requests => they are already in the cache
          delete window.__io_initial_options;
        };
        // send out a bundle saving original options (URLs) to fly() later
        xhr.open('PUT', '/bundle', true);
        window.__io_initial_options = ['/me', '/menu', '/clients'];
        xhr.send(JSON.stringify(window.__io_initial_options));
      }());
    </script>
    <script src="our.js"></script>
    <!-- other import, like CSS styles goes here -->
  </head>
  <body>
    <!-- HTML goes here -->
  </body>
</html>
```

The first script session is short. It issues a request for a bundle, which will be collected in `our.js` file.
We assume that it includes all code we need for our web application. We may import more JavaScript files before `our.js`.

Somewhere in `our.js` but after `io-bundle.js` is loaded we may deal with our pre-fetch:

```js
// somewhere in our.js after io-bundle.js,
// but preferably before our actual app code

(function () {
  'use strict';
  io.bundle.attach();

  // processing an initial bundle
  if (window.__io_initial_options) {
    // register I/O requests in progress
    io.bundle.fly(window.__io_initial_options);
    delete window.__io_initial_options;
    // if we don't fly() them, they can be reinitiated
    // by our code that requests those resources
  }
  if (window.__io_initial_bundle) {
    // if data have arrived => unbundle it
    io.bundle.unbundle(window.__io_initial_bundle);
    delete window.__io_initial_bundle;
  }
}());
```

### Pre-fetching a custom endpoint

We may create a custom endpoint, which will return a custom bundle with mosts responses required in the future.
Frequently, such endpoint takes no direct arguments figuring out details from a session object.

The code will be similar to the previous pre-fetch case.

```html
<!doctype html>
<html>
  <head>
    <!-- meta information goes here -->
    <script>
      'use strict';
      // data ahead section
      (function () {
        // put forward a bundle
        var xhr = new XMLHttpRequest();
        xhr.onload = function () {
          var data = JSON.parse(xhr.responseText);
          if (window.heya && heya.io && heya.io.bundle) {
            // if io.bundle is ready, use it to unbundle
            io.bundle.unbundle(data);
          } else {
            // otherwise store it for future unbundling
            window.__io_initial_bundle = data;
          }
          // no need to fly() the requests => they are already in the cache
          delete window.__io_initial_options;
        };
        // send out a bundle saving original options (URLs) to fly() later
        xhr.open('GET', '/custom/endpoint', true);
        window.__io_initial_options = ['/me', '/menu', '/clients'];
        xhr.send(null);
      }());
    </script>
    <script src="our.js"></script>
    <!-- other import, like CSS styles goes here -->
  </head>
  <body>
    <!-- HTML goes here -->
  </body>
</html>
```

As you can see the code is quite similar, but we use GET without any payload. We still need to register options (URLs) our code may to issue immediately.

The code snippet in `our.js` will be the same.

## The protocol

The protocol is very simple. A bundler is attached to an endpoint `/bundle` by default. It receives an array of `options` by PUT method as JSON.
`options` can be objects described above, URLs as strings, or a mix of both.

It verifies a bundle (all URLs should be whitelisted, empty payload, and big payloads are rejected, and so on).
If everything is alright, it issues I/O requests (usually in parallel), collects responses and sends back a JSON object of the following format:

```js
{
  "bundle": "bundle",
  "results": [
    // a list of result items
  ]
}
```

Every result item has a following structure:

```js
{
  "options": {"url": "/abc"}, // options object
  "response": {
    "status":       200,      // an HTTP status code
    "statusText":   "OK",     // an HTTP status text corresponding to status code
    "responseType": "",       // taken from options.responseType, or an empty string
    "responseText": "{a:1}",  // a payload as a string
    "headers": "Content-Type: application/json" // raw headers
  }
}
```
