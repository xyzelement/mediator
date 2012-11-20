var doT = require('dot')
var fs = require('fs');
var express = require("express");


app = express(); 
var data_template = "";

app.use(express.static(__dirname + '/public'));

fs.readFile( __dirname + '/public/content/second.html', function (err, data) {
  if (err) { throw err; }
  data_template = doT.template(data.toString());
});


function apply_template_to_history() {	
	return data_template([ 	{name: 'ed',   says: 'I think you suck'}, 
							{name: 'josh', says: 'Yeah I think you are right.' }]);
}


app.get('/', function(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html',
                          'Trailer': 'Content-MD5' });

  res.end(apply_template_to_history());
});

app.listen(8080);