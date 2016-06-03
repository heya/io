define(['module', 'heya-unit', 'heya-io/mock', 'heya-async/Deferred'], function (module, unit, io, Deferred) {
	'use strict';

	unit.add(module, [
		function test_setup () {
			io.Deferred = Deferred;
		},
		function test_exist (t) {
			eval(t.TEST('typeof io.mock == "function"'));
		},
		function test_teardownp () {
			io.Deferred = io.FauxDeferred;
		}
	]);

	return {};
});
