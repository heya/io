define(['module', 'heya-unit', 'heya-io/io', 'heya-io/load', 'heya-async/Deferred'], function (module, unit, io, load, Deferred) {
	'use strict';

	unit.add(module, [
		function test_setup () {
			io.Deferred = Deferred;
		},
		function test_exist (t) {
			eval(t.TEST('typeof load == "function"'));
		},
		function test_simple_io (t) {
			var x = t.startAsync();
			load('http://localhost:3000/tests/data/a.js').then(function () {
				eval(t.TEST('window.__a = "a"'));
				delete window.__a;
				x.done();
			});
		},
		function test_io_get_error (t) {
			var x = t.startAsync();
			load('http://localhost:3000/tests/data/b.js').then(function () {
				t.test(false); // we should not be here
				x.done();
			}).catch(function () {
				t.test(true);
				x.done();
			});
		},
		function test_teardown () {
			io.Deferred = io.FauxDeferred;
		}
	]);

	return {};
});
