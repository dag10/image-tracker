var config = require('./config');
var handlers = require('./handlers');
var moment = require('moment');
var _ = require('underscore');
var Backbone = require('backbone');
var Canvas = require('canvas');

var Client = Backbone.Model.extend({
	initialize: function() {
		var req = this.get('req');
		var res = this.get('res');
		
		res.on('close', _.bind(this.handleClose, this));
		
		console.log(this.cid, "CONNECTED FROM:", req.headers.referer);
		
		this.sendInitialHeaders();
	},
	
	sendInitialHeaders: function() {
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
	},
	
	sendFrame: function(image) {
		var res = this.get('res');
		
		res.write("Content-Type: image/png\r\n");
		res.write("Content-Length: " + image.length + "\r\n");
		res.write("\r\n");
		res.write(image);
			
		res.write("--" + config.multipartBoundary + "\r\n");
		res.write("\r\n");
		res.write("--" + config.multipartBoundary + "\r\n");
	},
	
	handleClose: function() {
		console.log(this.cid, "DISCONNECTED FROM:", this.get('req').headers.referer);
		this.collection.remove(this);
	}
});

var Clients = Backbone.Collection.extend({
	model: Client,
	
	initialize: function() {
		this.on("add", this.countUpdated, this);
		this.on("remove", this.countUpdated, this);
	},
	
	countUpdated: function() {
		var image = generateUserCountImage(this.size());
		
		this.each(function(client) {
			client.sendFrame(image);
		});
	}
});

var clients = new Clients();

function generateUserCountImage(count) {
	var canvas = new Canvas(200, 100);
	var ctx = canvas.getContext('2d');
	
	// Background
	ctx.fillStyle = "rgba(100, 149, 237, 0)";
	ctx.fillRect(0, 0, 200, 100);
	
	// Text
	ctx.fillStyle = "rgb(0, 100, 0)";
	ctx.font = "20px Impact";
	ctx.fillText("Users online: " + count, 10, 55);
	
	return canvas.toBuffer();
}

function handleRequest(req, res) {
	if (!req.headers.referer) {
		handlers.serveFile(req, res, config.file.directattempt, 403);
		return;
	}
	
	clients.add({
		req: req,
		res: res
	});
	
	console.log("CONNECTED USERS:", clients.size());
}

module.exports = {	
	url: '/online.png',
	clients: clients,
	handler: handleRequest
}