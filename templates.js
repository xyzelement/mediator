var doT = require('dot')

var convo_template = "";
var user_template = "";
var start_template = "";
var account_template = "";

var fs = require('fs');

fs.readFile(__dirname + '/public/content/convo.html', function (err, data) {
	if (err) { throw err; }
	convo_template = doT.template(data.toString());
});

fs.readFile(__dirname + '/public/content/user.html', function (err, data) {
	if (err) { throw err; }
	user_template = doT.template(data.toString());
});

fs.readFile(__dirname + '/public/content/start.html', function (err, data) {
	if (err) { throw err; }
	start_template = doT.template(data.toString());
});


  fs.readFile(__dirname + '/public/content/account.html', function (err, data) {
  	if (err) { throw err; }
  	account_template = doT.template(data.toString());
  });

exports.user_page  = function(user){ 
  fs.readFile(__dirname + '/public/content/user.html', function (err, data) {
  	if (err) { throw err; }
  	user_template = doT.template(data.toString());
  });
  return user_template(user); 
}

exports.start_page = function(user){ 
  fs.readFile(__dirname + '/public/content/start.html', function (err, data) {
  	if (err) { throw err; }
  	start_template = doT.template(data.toString());
  });
  return start_template(user); 
}

//EMTODO: go back to caching
exports.convo_page = function(user){ 
  fs.readFile(__dirname + '/public/content/convo.html', function (err, data) {
    if (err) { throw err; }
    convo_template = doT.template(data.toString());
  });

  return convo_template(user); 
}



exports.account_page = function(user){ 
  fs.readFile(__dirname + '/public/content/account.html', function (err, data) {
  	if (err) { throw err; }
  	account_template = doT.template(data.toString());
  });
  return account_template(user); 
}