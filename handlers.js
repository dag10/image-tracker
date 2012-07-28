var config = require('./config');
var fs = require('fs');
var path = require('path');
var moment = require('moment');
var _ = require('underscore');
var Backbone = require('backbone');

var Client = Backbone.Model.extend({

});

var Clients = Backbone.Collection.extend({
	model: Client
});

var clients = new Clients();

function serveOnlineImage(req, res) {

}

function generateMultipartHeaders() {
	return {
		'Connection': 'Close',
		'Expires': '-1',
		'Last-Modified': moment().utc().format("ddd, DD MMM YYYY HH:mm:ss") + ' GMT',
		'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0, false',
		'Pragma': 'no-cache',
		'Content-Type': 'multipart/x-mixed-replace; boundary=--' + config.multipartBoundary
	};
}

function serveTrackingImage(req, res) {
	var imagePath = config.webdir + config.file.flowerimg;
	var referer = req.headers.referer;
	
	if (!referer) {
		serveFile(req, res, config.file.directattempt, 403);
		return;
	}
	
	console.log("OPENED:", referer);
	
	var connected = true;
	res.on('close', function() {
		connected = false;
		console.log("CLOSED:", referer);
		res.end();
	});
		
	res.writeHead(200, generateMultipartHeaders());
	res.write("--" + config.multipartBoundary + "\r\n");
	
	var frame = 1;
	var sendFrame = function() {
		if (!connected) return;
		
		var framePath = config.webdir + config.file.imgframe.replace('%d', frame);
		
		fs.open(framePath, 'r', function(err, fd) {
			if (err) {
				console.error(err);
				res.end();
				return;
			}
			
			var stat = fs.fstatSync(fd);
			var size = stat.size;
			
			var frameBuffer = new Buffer(size);
			var bytesRead = fs.readSync(fd, frameBuffer, 0, size, 0);
			
			fs.closeSync(fd);
			
			if (bytesRead != size) {
				console.error("Size mismatch on frame " + frame);
				res.end();
				return;
			}
			
			res.write("Content-Type: image/jpeg\r\n");
			res.write("Content-Length: " + size + "\r\n");
			res.write("\r\n");
			res.write(frameBuffer);
			
			res.write("--" + config.multipartBoundary + "\r\n");
			res.write("\r\n");
			res.write("--" + config.multipartBoundary + "\r\n");
			
			if (frame == 1) frame = 2;
			else if (frame == 2) frame = 1;
			
			setTimeout(sendFrame, 1000);
		});
	};
	
	sendFrame();
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