var config = require('./config');
var http = require('http');
var handlers = require('./handlers');

http.createServer(requestHandler).listen(config.port, config.host);

function requestHandler(req, res) {
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