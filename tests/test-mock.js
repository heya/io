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
			test: function test_exact (t) {
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
		{
			test: function test_prefix (t) {
				var x = t.startAsync();
				io.mock('http://localhost:3000/aa*', function (options) {
					var value = 'aa' + (options.method || 'GET');
					t.info('mock callback: ' + value);
					return value;
				});
				io.mock('http://localhost:3000/a*', function (options) {
					var value = 'a' + (options.method || 'GET');
					t.info('mock callback: ' + value);
					return value;
				});
				io.mock('http://localhost:3000/aaa*', function (options) {
					var value = 'aaa' + (options.method || 'GET');
					t.info('mock callback: ' + value);
					return value;
				});
				io.get('http://localhost:3000/a/x').then(function (value) {
					t.info('got ' + value);
					return io.patch('http://localhost:3000/aa', null);
				}).then(function (value) {
					t.info('got ' + value);
					return io.put('http://localhost:3000/ab');
				}).then(function (value) {
					t.info('got ' + value);
					return io.post('http://localhost:3000/aaa', {z: 1});
				}).then(function (value) {
					t.info('got ' + value);
					io.mock('http://localhost:3000/a*', null);
					io.mock('http://localhost:3000/aa*', null);
					io.mock('http://localhost:3000/aaa*', null);
					return io.get('http://localhost:3000/aa');
				}).then(function () {
					t.info('shouldn\'t be here!');
					x.done();
				}, function () {
					t.info('error');
					x.done();
				});
			},
			logs: [
				'mock callback: aGET',
				'got aGET',
				'mock callback: aaPATCH',
				'got aaPATCH',
				'mock callback: aPUT',
				'got aPUT',
				'mock callback: aaaPOST',
				'got aaaPOST',
				'error'
			]
		},
		{
			test: function test_xhr (t) {
				var x = t.startAsync();
				io.mock('http://localhost:3000/a', function (options) {
					return io.mock.makeXHR({
						status: options.data.status,
						headers: 'Content-Type: application/json',
						responseType: 'json',
						responseText: JSON.stringify(options.data)
					});
				});
				io.get('http://localhost:3000/a', {status: 200, payload: 1}).then(function (value) {
					t.info('payload ' + value.payload);
					return io.put('http://localhost:3000/a', {status: 501, payload: 2});
				}).then(function () {
					t.info('shouldn\'t be here!');
					x.done();
				}, function (value) {
					io.mock('http://localhost:3000/a', null);
					t.info('payload ' + value.xhr.response.payload);
					t.info('error ' + value.xhr.status);
					x.done();
				});
			},
			logs: [
				'payload 1',
				'payload 2',
				'error 501'
			]
		},
		function test_teardownp () {
			io.Deferred = io.FauxDeferred;
			io.detach('mock');
		}
	]);

	return {};
});
