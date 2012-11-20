var express = require("express");
app = express(); 
app.use(express.static(__dirname + '/public'));
app.use(express.bodyParser());

var data_template = "";
var fs = require('fs');
// TODO: you'll probably want to include an 'encoding' to fs.readFile (utf8 works)
// TODO: 'readFileSync'
fs.readFile( __dirname + '/public/content/second.html', function (err, data) {
  if (err) { throw err; }
  data_template = doT.template(data.toString());
});



var doT = require('dot')
var db = require('mongojs').connect('mydb', ['arguments']);
app.get('/', function (req, res) {    
	db.arguments.find({}, function(err, users) {
		res.writeHead(200, { 'Content-Type': 'text/html', 'Trailer': 'Content-MD5' });
	
		if( err || !users) 	{ 
			res.end("Oops. No data found");
		} else {
			var obj={
				argument: users,
				alert: req.query["alert"]
			};			
			res.end(data_template(obj));
		}
	});
});

app.post('/add', function (req, res) {    
	if(req.body.name.length === 0 || req.body.says.length === 0) {
		res.redirect('/?alert=You probably want to say something here right now');
		return;
	}

	db.arguments.save({name: req.body.name, says: req.body.says}, 
		function(err, saved) {
			if( err || !saved ) console.log("User not saved");
			res.redirect('/');
		});
});

app.listen(8080);