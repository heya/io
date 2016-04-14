define(['module', 'heya-unit', '../io', '../jsonp', 'heya-async/Deferred'], function (module, unit, io, jsonp, Deferred) {
	'use strict';

	unit.add(module, [
		function test_setup () {
			io.Deferred = Deferred;
		},
		function test_exist (t) {
			eval(t.TEST('typeof jsonp == "function"'));
		},
		function test_simple_io (t) {
			var x = t.startAsync();
			jsonp('http://localhost:3000/api').then(function (data) {
				eval(t.TEST('data.method === "GET"'));
				eval(t.TEST('data.body === null'));
				x.done();
			});
		},
		function test_io_get_query (t) {
			var x = t.startAsync();
			jsonp('http://localhost:3000/api', {a: 1}).then(function (data) {
				eval(t.TEST('data.method === "GET"'));
				eval(t.TEST('data.query.a === "1"'));
				x.done();
			});
		},
		function test_io_get_error (t) {
			var x = t.startAsync();
			jsonp('http://localhost:3000/api', {status: 500}).then(function (data) {
				t.test(false); // we should not be here
				x.done();
			}).catch(function (data) {
				eval(t.TEST('data.xhr === null'));
				x.done();
			});
		},
		function test_teardownp () {
			io.Deferred = io.FauxDeferred;
		}
	]);

	return {};
});
