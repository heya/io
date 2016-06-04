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
			io.get('http://localhost:3000/api').then(function (value) {
				counter = value.counter;
				return io.get('http://localhost:3000/api');
			}).then(function (value) {
				eval(t.TEST('counter === value.counter'));
				x.done();
			});
		},
		function test_teardownp () {
			io.Deferred = io.FauxDeferred;
			io.detach('cache');
			io.cache.storage.clear();
		}
	]);

	return {};
});
