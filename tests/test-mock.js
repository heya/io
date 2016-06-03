define(['module', 'heya-unit', 'heya-io/mock', 'heya-async/Deferred', 'heya-async/timeout'], function (module, unit, io, Deferred, timeout) {
	'use strict';

	unit.add(module, [
		function test_setup () {
			io.Deferred = Deferred;
			io.mock.attach();
		},
		function test_exist (t) {
			eval(t.TEST('typeof io.mock == "function"'));
		},
		{
			test: function test_basics (t) {
				var x = t.startAsync();
				io.mock('http://localhost:3000/a', function (options) {
					var verb = options.method || 'GET';
					t.info('mock callback: ' + verb);
					return verb;
				});
				io.get('http://localhost:3000/a').then(function (value) {
					t.info('got ' + value);
					return io.patch('http://localhost:3000/a', null);
				}).then(function (value) {
					t.info('got ' + value);
					io.mock('http://localhost:3000/a', null);
					return io.get('http://localhost:3000/a');
				}).then(function () {
					t.info('shouldn\'t be here!');
					x.done();
				}, function () {
					t.info('error');
					x.done();
				});
			},
			logs: [
				'mock callback: GET',
				'got GET',
				'mock callback: PATCH',
				'got PATCH',
				'error'
			]
		},
		function test_teardownp () {
			io.Deferred = io.FauxDeferred;
			io.detach('mock');
		}
	]);

	return {};
});
