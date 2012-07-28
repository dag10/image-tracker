var config = require('./config');
var http = require('http');
var handlers = require('./handlers');
var usercount = require('./usercount');

http.createServer(requestHandler).listen(config.port, config.host);

function requestHandler(req, res) {
	switch (req.url) {
		case usercount.url:
			usercount.handler(req, res);
			break;
		default:
			findHandler(req, res);
			break;
	}
}

function findHandler(req, res) {
	var handlerFound = false;
	
	for (var route in handlers.routes) {
		if (route == req.url) {
			handlers.routes[route](req, res);
			handlerFound = true;
		}
	}
	
	if (!handlerFound)
		handlers.serveFile(req, res);
}