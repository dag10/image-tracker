/* Real-Time PNG-Streaming HTTP User Counter
   Copyright Drew Gottlieb, 2012

   Free for any use, but don't claim
   that this is your work.

   Doesn't work on Windows because
   node-canvas only works on Linux and OSX. */

var moment = require('moment');
var http = require('http');
var _ = require('underscore');
var Backbone = require('backbone');
var Canvas = require('canvas');

var config = {
	port:	9192,
	host:	"0.0.0.0",
	updateInterval: 3000, // 5 seconds
	multipartBoundary: "whyhellothere"
};

var Client = Backbone.Model.extend({
	initialize: function() {
		var req = this.get('req');
		var res = this.get('res');
		
		console.log("Page opened:", req.headers.referer);
		
		res.on('close', _.bind(this.handleClose, this));
		req.on('close', _.bind(this.handleClose, this));
		this.sendInitialHeaders();
		this.set('updateinterval', setInterval(_.bind(this.sendUpdate, this), config.updateInterval));
	},
	
	// Re-send the image in case it needs to be re-rendered
	sendUpdate: function() {
		if (this.get('sending')) return;
		if (!this.get('imagecache')) return;
		
		this.sendFrame(this.get('imagecache'));
	},
	
	// Sends the actual HTTP headers
	sendInitialHeaders: function() {
		this.set('sending', true);
		
		var res = this.get('res');
		res.writeHead(200, {
			'Connection': 'Close',
			'Expires': '-1',
			'Last-Modified': moment().utc().format("ddd, DD MMM YYYY HH:mm:ss") + ' GMT',
			'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0, false',
			'Pragma': 'no-cache',
			'Content-Type': 'multipart/x-mixed-replace; boundary=--' + config.multipartBoundary
		});
		res.write("--" + config.multipartBoundary + "\r\n");
		
		this.set('sending', false);
	},
	
	// Sends an image frame, followed by an empty part to flush the image through
	sendFrame: function(image) {
		this.set('sending', true);
		this.set('imagecache', image);
		
		var res = this.get('res');
		
		res.write("Content-Type: image/png\r\n");
		res.write("Content-Length: " + image.length + "\r\n");
		res.write("\r\n");
		res.write(image);
			
		res.write("--" + config.multipartBoundary + "\r\n");
		res.write("\r\n");
		res.write("--" + config.multipartBoundary + "\r\n");
		
		this.set('sending', false);
	},
	
	// Handle a disconnect
	handleClose: function() {
		if (this.get('closed')) return;
		this.set('closed', true);
		
		console.log("Page closed:", this.get('req').headers.referer);
		this.collection.remove(this);
		clearInterval(this.get('updateinterval'));
	}
});

var Clients = Backbone.Collection.extend({
	model: Client,
	
	initialize: function() {
		this.on("add", this.countUpdated, this);
		this.on("remove", this.countUpdated, this);
	},
	
	// Handle the client count changing
	countUpdated: function() {
		var image = this.generateUserCountImage(this.size());
		
		this.each(function(client) {
			client.sendFrame(image);
		});
	
		console.log("Connections:", this.size());
	},
	
	// Generate a new image
	generateUserCountImage: function(count) {
		var canvas = new Canvas(200, 30);
		var ctx = canvas.getContext('2d');
		
		// Background
		ctx.fillStyle = "rgba(100, 149, 237, 0)";
		ctx.fillRect(0, 0, 200, 30);
		
		// Text
		ctx.fillStyle = "rgb(0, 100, 0)";
		ctx.font = "20px Impact";
		ctx.fillText("Users online: " + count, 10, 20);
		
		return canvas.toBuffer();
	}
});

function handleRequest(req, res) {
	switch (req.url) {
		case '/':
		case '/index.html':
			showDemoPage(req, res);
			break;
		case '/online.png':
			showImage(req, res);			
			break;
		default:
			show404(req, res);
			break;
	}
}

function showDemoPage(req, res) {
	res.writeHead(200, {'Content-Type': 'text/html'});
	res.write("<h1>Users viewing this page:</h1>");
	res.write("<img src=\"/online.png\" />");
	res.write("<h5>(probably won't work on IE or Opera)</h5>");
	res.end();
}

function showImage(req, res) {
	// If this image is not embedded in a <img> tag, don't show it.
	if (!req.headers.referer) {
		res.writeHead(403, {'Content-Type': 'text/html'});
		res.end("You can't view this image directly.");
		return;
	}
	
	// Create a new client to handle this connection
	clients.add({
		req: req,
		res: res
	});
}

function show404(req, res) {
	res.writeHead(404, {'Content-Type': 'text/html'});
	res.end("<h1>not found</h1><br /><a href=\"/\">go home</a>");
}

// Ready, Set, Go!

var clients = new Clients();
http.createServer(handleRequest).listen(config.port, config.host);

console.log("Started.");