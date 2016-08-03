define(['module', 'heya-unit', 'heya-io/io', 'heya-async/Deferred-ext', 'heya-io/bust'], function (module, unit, io, Deferred) {
	'use strict';

	unit.add(module, [
		function test_setup () {
			io.Deferred = Deferred;
		},
		function test_exist (t) {
			eval(t.TEST('typeof io.bustKey == "string"'));
			eval(t.TEST('typeof io.generateTimestamp == "function"'));
		},
		function test_bust_query (t) {
			var x = t.startAsync();
			io.get({url: 'http://localhost:3000/api', bust: true}).then(function (data) {
				eval(t.TEST('data.query["io-bust"]'));
				x.done();
			});
		},
		function test_custom_bust (t) {
			var x = t.startAsync();
			io.get({url: 'http://localhost:3000/api', bust: 'buster'}).then(function (data) {
				eval(t.TEST('data.query.buster'));
				x.done();
			});
		},
		function test_two_bust_values (t) {
			var x = t.startAsync();
			Deferred.par(
				io.get({url: 'http://localhost:3000/api', bust: true}),
				io.get({url: 'http://localhost:3000/api', bust: true})
			).then(function (results) {
				eval(t.TEST('results[0].query["io-bust"]'));
				eval(t.TEST('results[1].query["io-bust"]'));
				eval(t.TEST('results[0].query["io-bust"] !== results[1].query["io-bust"]'));
				x.done();
			});
		},
		function test_teardownp () {
			io.Deferred = io.FauxDeferred;
		}
	]);

	return {};
});
