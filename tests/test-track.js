define(['module', 'heya-unit', 'heya-io/track', 'heya-async/Deferred-ext'], function (module, unit, io, Deferred) {
	'use strict';

	unit.add(module, [
		function test_setup () {
			io.Deferred = Deferred;
			io.track.attach();
		},
		function test_exist (t) {
			eval(t.TEST('typeof io.track == "object"'));
		},
		function test_dedupe (t) {
			var x = t.startAsync();
			Deferred.par(
				io.get('http://localhost:3000/api'),
				io.get('http://localhost:3000/api')
			).then(function (results) {
				eval(t.TEST('results.length === 2'));
				eval(t.TEST('results[0].counter === results[1].counter'));
				x.done();
			});
		},
		function test_no_dedupe (t) {
			var x = t.startAsync(), counter;
			io.get('http://localhost:3000/api').then(function (value) {
				counter = value.counter;
				return io.get('http://localhost:3000/api');
			}).then(function (value) {
				eval(t.TEST('counter !== value.counter'));
				x.done();
			});
		},
		function test_teardownp () {
			io.Deferred = io.FauxDeferred;
			io.detach('track');
		}
	]);

	return {};
});
