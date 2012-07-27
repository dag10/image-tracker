var config = require('./config');
var fs = require('fs');
var path = require('path');

function serveTrackingImage(req, res) {
	
	var imagePath = config.webdir + config.file.flowerimg;
	
	path.exists(imagePath, function(exists) {
		if (exists) {
			fs.readFile(imagePath, function(error, content) {
				if (error) {
					res.writeHead(500);
					res.end();
					return;
				}
				
				res.writeHead(200, {
					'Content-Type': 'image/jpeg'
				});
				
				res.end(content);
				
				console.log("SERVED FLOWER IMAGE!");
			});
		} else {
			res.writeHead(404);
			res.end("image.jpg not found!");
		}
	});
}

function serveFile(req, res, url, status) {
	var url = url || req.url;
	var status = status || 200;
	
	if (url == '/') url = config.file.index;
	var filePath = config.webdir + url;
		 
	var extname = path.extname(filePath);
	var contentType = 'text/plain';
	switch (extname) {
		case '.html':
		case '.htm':
			contentType = 'text/html';
			break;
		case '.js':
			contentType = 'text/javascript';
			break;
		case '.css':
			contentType = 'text/css';
			break;
	}
	 
	path.exists(filePath, function(exists) {
		if (exists) {
			fs.readFile(filePath, function(error, content) {
				if (error) {
					res.writeHead(500);
					res.end();
				} else {
					res.writeHead(status, { 'Content-Type': contentType });
					res.end(content, 'utf-8');
				}
			});
		} else if (status != 404) {
			serveFile(req, res, config.file.notfound, 404);
		} else {
			res.writeHead(404);
			res.end("not found");
		}
	});
}

module.exports = {
	serveFile: serveFile,
	
	routes: {
		"/image.jpg": serveTrackingImage
	}
}