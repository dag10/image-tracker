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
		
		req.on('close', _.bind(this.handleClose, this));
		res.on('close', _.bind(this.handleClose, this));
		
		console.log("CONNECT:", this.cid);
		
		//this.sendInitialHeaders();
		//this.sendFrame();
		this.sendTestImage();
	},
	
	sendInitialHeaders: function() {
		this.get('res').writeHead(200, {
			'Connection': 'Close',
			'Expires': '-1',
			'Last-Modified': moment().utc().format("ddd, DD MMM YYYY HH:mm:ss") + ' GMT',
			'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0, false',
			'Pragma': 'no-cache',
			'Content-Type': 'multipart/x-mixed-replace; boundary=--' + config.multipartBoundary
		});
	},
	
	sendFrame: function() {
		
	},
	
	sendTestImage: function() {
		var res = this.get('res');
		
		var canvas = new Canvas(200, 200);
		var ctx = canvas.getContext('2d');
		
		ctx.font = '30px Impact';
		ctx.rotate(0.1);
		ctx.fillText("Awesome!", 50, 100);

		var te = ctx.measureText('Awesome!');
		ctx.strokeStyle = 'rgba(0,0,0,0.5)';
		ctx.beginPath();
		ctx.lineTo(50, 102);
		ctx.lineTo(50 + te.width, 102);
		ctx.stroke();
		
		res.writeHead(200, {
			'Connection': 'Close',
			'Expires': '-1',
			'Last-Modified': moment().utc().format("ddd, DD MMM YYYY HH:mm:ss") + ' GMT',
			'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0, false',
			'Pragma': 'no-cache',
			'Content-Type': 'image/png'
		});
		
		res.end(ctx.toBuffer());
	},
	
	handleClose: function() {
		this.collection.remove(this);
		this.get('res').end();
		
		console.log("DISCONNECT:", this.cid);
	}
});

var Clients = Backbone.Collection.extend({
	model: Client
});

var clients = new Clients();

function handleRequest(req, res) {
	if (!req.headers.referer) {
		handlers.serveFile(req, res, config.file.directattempt, 403);
		return;
	}
	
	clients.add({
		req: req,
		res: res
	});
}

module.exports = {	
	url: '/online.png',
	clients: clients,
	handler: handleRequest
}