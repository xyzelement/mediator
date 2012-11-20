var express = require("express");
app = express(); 
app.use(express.static(__dirname + '/public'));


var data_template = "";
var fs = require('fs');
fs.readFile( __dirname + '/public/content/second.html', function (err, data) {
  if (err) { throw err; }
  data_template = doT.template(data.toString());
});


var doT = require('dot')
var db = require('mongojs').connect('mydb', ['arguments']);
app.get('/', function(req, res) {

	db.arguments.find({}, function(err, users) {
		res.writeHead(200, { 'Content-Type': 'text/html', 'Trailer': 'Content-MD5' });
	
		if( err || !users) 	{ 
			res.end("Oops. No data found");
		} else {
			res.end(data_template(users));
		}
	});
});

app.listen(8080);