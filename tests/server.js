'use strict';

var http = require('http');
var path = require('path');
var debug = require('debug')('heya-io:server');
var express = require('express');
var bodyParser = require('body-parser');

var bundler = require('heya-bundler');

// The APP

var app = express();

app.use(bodyParser.raw({type: '*/*'}));

var counter = 0;

app.all('/api*', function (req, res) {
	if (req.query.status) {
		var status = parseInt(req.query.status, 10);
		if (isNaN(status) || status < 100 || status >= 600) {
			status = 200;
		}
		res.status(status);
	}
	switch (req.query.payloadType) {
		case 'txt':
			res.set('Content-Type', 'text/plain');
			res.send('Hello, world!');
			return;
		case 'xml':
			res.set('Content-Type', 'application/xml');
			res.send('<div>Hello, world!</div>');
			return;
	}
	var data = {
			method: req.method,
			protocol: req.protocol,
			hostname: req.hostname,
			url: req.url,
			originalUrl: req.originalUrl,
			headers: req.headers,
			body: req.body && req.body.length && req.body.toString() || null,
			query: req.query,
			now: Date.now(),
			counter: counter++
		};
	var timeout = 0;
	if (req.query.timeout) {
		var timeout = parseInt(req.query.timeout, 10);
		if (isNaN(timeout) || timeout < 0 || timeout > 60000) {
			timeout = 0;
		}
	}
	if (timeout) {
		setTimeout(function () {
			res.jsonp(data);
		}, timeout);
	} else {
		res.jsonp(data);
	}
});

app.put('/bundle', bundler({
	isUrlAcceptable: isUrlAcceptable,
	resolveUrl: resolveUrl
}));

function isUrlAcceptable (uri) {
	return typeof uri == 'string' && !/^\/\//.test(uri) &&
		(uri.charAt(0) === '/' || /^http:\/\/localhost:3000\//.test(uri));
}

function resolveUrl (uri) {
	return uri.charAt(0) === '/' ? 'http://localhost:3000' + uri : uri;
}

app.use(express.static(path.join(__dirname, '..')));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handlers

app.use(function(err, req, res, next) {
	// for simplicity we don't use fancy HTML formatting opting for a plain text
	res.status(err.status || 500);
	res.set('Content-Type', 'text/plain');
	res.send('Error (' + err.status + '): ' + err.message + '\n' + err.stack);
	debug('Error: ' + err.message + ' (' + err.status + ')');
});

// The SERVER

/**
 * Get port from environment and store in Express.
 */

var host = process.env.HOST || 'localhost',
	port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on provided host, or all network interfaces.
 */

server.listen(port, host);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
	var port = parseInt(val, 10);

	if (isNaN(port)) {
		// named pipe
		return val;
	}

	if (port >= 0) {
		// port number
		return port;
	}

	return false;
}

/**
 * Human-readable port description.
 */

function portToString (port) {
	return typeof port === 'string' ? 'pipe ' + port : 'port ' + port;
}


/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
	if (error.syscall !== 'listen') {
		throw error;
	}

	var bind = portToString(port);

	// handle specific listen errors with friendly messages
	switch (error.code) {
		case 'EACCES':
			console.error('Error: ' + bind + ' requires elevated privileges');
			process.exit(1);
			break;
		case 'EADDRINUSE':
			console.error('Error: ' + bind + ' is already in use');
			process.exit(1);
			break;
		default:
			throw error;
	}
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
	//var addr = server.address();
	var bind = portToString(port);
	debug('Listening on ' + (host || 'all network interfaces') + ' ' + bind);
}
