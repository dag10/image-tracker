module.exports = {
	port:	9192,
	host:	"0.0.0.0",
	webdir:	"./www",
	
	file: {
		notfound:	"/404.html",
		index:		"/index.html",
		flowerimg:	"/flowers.jpg",
		imgframe:	"/frame%d.jpg",
		directattempt: "/forbiddirect.html"
	},
	
	imageChunkSize: 1,
	imageChunkInterval: 250,
	
	multipartBoundary: "whyhellothere"
};