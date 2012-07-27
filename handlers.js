var config = require('./config');
var fs = require('fs');
var path = require('path');
var moment = require('moment');

function serveTrackingImage(req, res) {
	var imagePath = config.webdir + config.file.flowerimg;
	var referer = req.headers.referer;
	
	console.log("OPENED:", referer ? referer : "DIRECT IMAGE");
	
	var connected = true;
	res.on('close', function() {
		connected = false;
		console.log("CLOSED:", referer ? referer : "DIRECT IMAGE");
	});
	
	path.exists(imagePath, function(exists) {
		if (!exists) {
			serveFile(req, res, config.file.notfound, 404);
			return;
		}
		
		fs.open(imagePath, 'r', function(err, fd) {
			if (err) {
				console.error(err);
				res.writeHead(500);
				res.end();
			}
		
			res.writeHead(200, {
				'Content-Type': 'image/jpeg',
				'Connection': 'Keep-Alive',
				//'Expires': 'Tue, 03 Jul 2001 06:00:00 GMT',
				'Expires': '-1',
				'Last-Modified': moment().utc().format("ddd, DD MMM YYYY HH:mm:ss") + ' GMT',
				'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0, false',
				'Pragma': 'no-cache'
			});
			
			var chunkSize = config.imageChunkSize;
			var offset = 0;
			
			var sendChunk = function() {
				if (!connected) return;
				
				var buffer = new Buffer(chunkSize);
				var bytesRead = fs.readSync(fd, buffer, 0, chunkSize, offset);
				
				if (bytesRead <= 0) {
					res.end();
					return;
				}
				
				res.write(buffer);
				offset += chunkSize;
				
				setTimeout(sendChunk, config.imageChunkInterval);
			};
			
			sendChunk();
		});
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