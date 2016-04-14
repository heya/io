define(['module', 'heya-unit', '../io'], function (module, unit, io) {
	'use strict';

	if (typeof Promise == 'undefined') return;

	io.Deferred = io.FauxDeferred;

	unit.add(module, [
		function test_exist (t) {
			eval(t.TEST('typeof io == "function"'));
			eval(t.TEST('typeof io.get == "function"'));
			eval(t.TEST('typeof io.put == "function"'));
			eval(t.TEST('typeof io.post == "function"'));
			eval(t.TEST('typeof io.patch == "function"'));
			eval(t.TEST('typeof io.remove == "function"'));
			eval(t.TEST('typeof io["delete"] == "function"'));
		},
		function test_simple_io (t) {
			var x = t.startAsync();
			io('http://localhost:3000/api').then(function (data) {
				eval(t.TEST('data.method === "GET"'));
				eval(t.TEST('data.body === null'));
				x.done();
			});
		},
		function test_io_get (t) {
			var x = t.startAsync();
			io.get('http://localhost:3000/api').then(function (data) {
				eval(t.TEST('data.method === "GET"'));
				eval(t.TEST('data.body === null'));
				x.done();
			});
		},
		function test_io_put (t) {
			var x = t.startAsync();
			io.put('http://localhost:3000/api', {a: 1}).then(function (data) {
				eval(t.TEST('data.method === "PUT"'));
				eval(t.TEST('data.body === "{\\"a\\":1}"'));
				x.done();
			});
		},
		function test_io_post (t) {
			var x = t.startAsync();
			io.post('http://localhost:3000/api', {a: 1}).then(function (data) {
				eval(t.TEST('data.method === "POST"'));
				eval(t.TEST('data.body === "{\\"a\\":1}"'));
				x.done();
			});
		},
		function test_io_patch (t) {
			var x = t.startAsync();
			io.patch('http://localhost:3000/api', {a: 1}).then(function (data) {
				eval(t.TEST('data.method === "PATCH"'));
				eval(t.TEST('data.body === "{\\"a\\":1}"'));
				x.done();
			});
		},
		function test_io_remove (t) {
			var x = t.startAsync();
			io.remove('http://localhost:3000/api', {a: 1}).then(function (data) {
				eval(t.TEST('data.method === "DELETE"'));
				eval(t.TEST('data.body === "{\\"a\\":1}"'));
				x.done();
			});
		},
		function test_io_get_query (t) {
			var x = t.startAsync();
			io.get('http://localhost:3000/api', {a: 1}).then(function (data) {
				eval(t.TEST('data.method === "GET"'));
				eval(t.TEST('t.unify(data.query, {a: "1"})'));
				x.done();
			});
		},
		function test_io_get_error (t) {
			var x = t.startAsync();
			io.get('http://localhost:3000/api', {status: 500}).then(function (data) {
				t.test(false); // we should not be here
				x.done();
			}).catch(function (data) {
				eval(t.TEST('data.xhr.status === 500'));
				x.done();
			});
		},
		function test_io_get_txt (t) {
			var x = t.startAsync();
			io.get('http://localhost:3000/api', {payloadType: 'txt'}).then(function (data) {
				eval(t.TEST('typeof data == "string"'));
				eval(t.TEST('data == "Hello, world!"'));
				x.done();
			});
		},
		function test_io_get_xml (t) {
			var x = t.startAsync();
			io.get('http://localhost:3000/api', {payloadType: 'xml'}).then(function (data) {
				eval(t.TEST('typeof data == "object"'));
				eval(t.TEST('data.nodeName == "#document"'));
				eval(t.TEST('data.nodeType == 9'));
				x.done();
			});
		},
		function test_io_get_xml_as_text_mime (t) {
			var x = t.startAsync();
			io.get({
				url: 'http://localhost:3000/api',
				mime: 'text/plain'
			}, {payloadType: 'xml'}).then(function (data) {
				eval(t.TEST('typeof data == "string"'));
				eval(t.TEST('data == "<div>Hello, world!</div>"'));
				x.done();
			});
		},
		function test_io_get_xml_as_text (t) {
			var x = t.startAsync();
			io.get({
				url: 'http://localhost:3000/api',
				responseType: 'text'
			}, {payloadType: 'xml'}).then(function (data) {
				eval(t.TEST('typeof data == "string"'));
				eval(t.TEST('data == "<div>Hello, world!</div>"'));
				x.done();
			});
		},
		function test_io_get_xml_as_blob (t) {
			if (typeof Blob == 'undefined') return;
			var x = t.startAsync();
			io.get({
				url: 'http://localhost:3000/api',
				responseType: 'blob'
			}, {payloadType: 'xml'}).then(function (data) {
				eval(t.TEST('data instanceof Blob'));
				x.done();
			});
		},
		function test_io_get_xml_as_array_buffer (t) {
			if (typeof ArrayBuffer == 'undefined') return;
			var x = t.startAsync();
			io.get({
				url: 'http://localhost:3000/api',
				responseType: 'arraybuffer'
			}, {payloadType: 'xml'}).then(function (data) {
				eval(t.TEST('data instanceof ArrayBuffer'));
				x.done();
			});
		}
	]);

	return {};
});
