define(['module', 'heya-unit', 'heya-io/cache', 'heya-async/Deferred-ext'], function (module, unit, io, Deferred) {
	'use strict';

	unit.add(module, [
		function test_setup () {
			io.Deferred = Deferred;
			io.cache.attach();
		},
		function test_exist (t) {
			eval(t.TEST('typeof io.cache == "object"'));
		},
		function test_cache (t) {
			var x = t.startAsync(), counter;
			io.cache.storage.clear();
			// the next one should be from a server
			io.get('http://localhost:3000/api').then(function (value) {
				counter = value.counter;
				// the next one should be from cache
				return io.get('http://localhost:3000/api');
			}).then(function (value) {
				eval(t.TEST('counter === value.counter'));
				io.cache.storage.clear();
				// the next one should be from a server
				return io.get('http://localhost:3000/api');
			}).then(function (value) {
				eval(t.TEST('counter !== value.counter'));
				x.done();
			});
		},
		function test_teardown () {
			io.Deferred = io.FauxDeferred;
			io.cache.detach();
			io.cache.storage.clear();
		}
	]);

	return {};
});
