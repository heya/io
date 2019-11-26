define(['module', 'heya-unit', 'heya-io/io', 'heya-io/retry'], function (module, unit, io) {
	'use strict';


	var isXml = /^application\/xml\b/,
		isOctetStream = /^application\/octet-stream\b/,
		isMultiPart = /^multipart\/form-data\b/;

	unit.add(module, [
		function test_setup () {
			io.retry.attach();
		},
		function test_exist (t) {
			eval(t.TEST('typeof io.retry == "object"'));
		},
		function test_no_retry (t) {
			var x = t.startAsync();
			io('http://localhost:3000/api').then(function (data) {
				eval(t.TEST('data.method === "GET"'));
				x.done();
			});
		},
		function test_retry_success (t) {
			var x = t.startAsync();
			io({
				url: 'http://localhost:3000/api',
				retries: 3
			}).then(function (data) {
				eval(t.TEST('data.method === "GET"'));
				x.done();
			});
		},
		function test_retry_failure (t) {
			var x = t.startAsync();
			io({
				url: 'http://localhost:3000/xxx', // doesn't exist
				retries: 3
			}).catch(function (error) {
				eval(t.TEST('error.xhr.status === 404'));
				x.done();
			});
		},
		function test_cond_retry_counter (t) {
			var x = t.startAsync(), counter = 0;
			io({
				url: 'http://localhost:3000/xxx', // doesn't exist
				retries: 3,
				continueRetries: function () { ++counter; return true; }
			}).catch(function (error) {
				eval(t.TEST('error.xhr.status === 404'));
				eval(t.TEST('counter === 3'));
				x.done();
			});
		},
		function test_cond_retry_counter_term_by_func (t) {
			var x = t.startAsync(), counter = 0;
			io({
				url: 'http://localhost:3000/xxx', // doesn't exist
				retries: 5,
				continueRetries: function (xhr, retries) { ++counter; return retries < 2; }
			}).catch(function (error) {
				eval(t.TEST('error.xhr.status === 404'));
				eval(t.TEST('counter === 2'));
				x.done();
			});
		},
		function test_cond_retry_failure (t) {
			var x = t.startAsync(), counter = 0;
			io({
				url: 'http://localhost:3000/xxx', // doesn't exist
				retries: 0,
				continueRetries: function (xhr, retries) { ++counter; return retries < 2; }
			}).catch(function (error) {
				eval(t.TEST('error.xhr.status === 404'));
				eval(t.TEST('counter === 2'));
				x.done();
			});
		},
		function test_teardown () {
			io.retry.detach();
		}
	]);

	return {};
});
