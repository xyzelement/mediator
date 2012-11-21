// https://docs.appfog.com/languages/node
// TODO: use the above to hook into the production mondodb

var users = require("./user_stuff");

var express = require("express");
app = express();

var mongo;
app.configure('development', function(){
    mongo = {
        "hostname":"localhost",
        "port":27017,
        "username":"",
        "password":"",
        "name":"",
        "db":"mydb"
    }
});
app.configure('production', function(){
    var env = JSON.parse(process.env.VCAP_SERVICES);
    mongo = env['mongodb-1.8'][0]['credentials'];
});

var generate_mongo_url = function(obj){
    obj.hostname = (obj.hostname || 'localhost');
    obj.port = (obj.port || 27017);
    obj.db = (obj.db || 'test');
    if(obj.username && obj.password){
        return "mongodb://" + obj.username + ":" + obj.password + "@" + obj.hostname + ":" + obj.port + "/" + obj.db;
    }else{
        return "mongodb://" + obj.hostname + ":" + obj.port + "/" + obj.db;
    }
}

var mongourl = generate_mongo_url(mongo);

//var db = require('mongojs').connect('mydb', ['topics', 'arguments']);
var db = require('mongojs').connect(mongourl, ['topics', 'arguments']);









var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.session({secret : 'keyboard cat'}));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(__dirname + '/public'));

var convo_template = "";
var user_template = "";

var fs = require('fs');
// TODO: you'll probably want to include an 'encoding' to fs.readFile (utf8 works)
// TODO: 'readFileSync'
fs.readFile(__dirname + '/public/content/convo.html', function (err, data) {
	if (err) { throw err; }
	convo_template = doT.template(data.toString());
});

fs.readFile(__dirname + '/public/content/user.html', function (err, data) {
	if (err) { throw err; }
	user_template = doT.template(data.toString());
});

var doT = require('dot')



passport.serializeUser(function (user, done) {
	done(null, user.id);
});

passport.deserializeUser(function (id, done) {
	users.findById(id, function (err, user) {
		done(err, user);
	});
});

passport.use(new LocalStrategy(
		function (username, password, done) {
		users.findByUsername(username, function (err, user) {
			if (err) { return done(err); }
			if (!user)                     { return done(null, false, { message : 'Unknown user ' + username });}
			if (user.password != password) { return done(null, false, { message : 'Invalid password' }); }
			return done(null, user);
		})
	}));

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/content/login.html')
}

app.get('/', ensureAuthenticated, function (req, res) {
	res.redirect('/user');
});

app.get('/login', //TODOfigure out this failureflash
	passport.authenticate('local', {
		failureRedirect : '/content/login.html',
		failureFlash : false
	}),
	function (req, res) {
	res.redirect('/');
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});


app.get('/user', ensureAuthenticated, function (req, res) {
	db.topics.find({ $or : [ {from: req.user.username}, { to:   req.user.username}   ]}, function (err, entries) { //TODO: keys
		res.writeHead(200, {'Content-Type' : 'text/html',	'Trailer' : 'Content-MD5'	});
		
		if (err || !entries) {
			res.end("Oops. No data found");
		} else {
			var obj = {
				topics : entries,
				alert : req.query["alert"],
        current_user: req.user.username			};
			res.end(user_template(obj));
		}
	});
});

app.post('/start', ensureAuthenticated, function (req, res) {
	if (req.body.with.length === 0) {
		res.redirect('/user?alert=Please specify a user');
		return;
	}
	if (req.body.says.length === 0) {
		res.redirect('/user?alert=Please say something');
		return;
	}	
  
  users.findByUsername(req.body.with, function (err, usr) {
    if(!usr) {
      res.redirect('/user?alert=invalid user');
    } else if (usr.username == req.user.username) {
      res.redirect('/user?alert=Cannot argue with self');
    } else {
      var t = {
        topic: req.body.says,
        from:  req.user.username,
        to:    usr.username
      }
      db.topics.save(t);
      res.redirect('/read?topic='+req.body.says);
    }
  })

});

app.get('/read', ensureAuthenticated, function (req, res) {

  if(!req.query["topic"] || req.query["topic"].length==0) {
    res.redirect('/user');
    return;
  }
	db.arguments.find({topic: req.query["topic"]}, function (err, entries) {
		res.writeHead(200, {'Content-Type' : 'text/html',	'Trailer' : 'Content-MD5'	});
		
		if (err || !entries) {
			res.end("Oops. No data found");
		} else {
			var obj = {
        topic:        req.query["topic"],
				argument :    entries,
				alert :       req.query["alert"],
        current_user: req.user.username
			};
			res.end(convo_template(obj));
		}
	});
});

app.post('/add', ensureAuthenticated, function (req, res) {
	if (req.body.says.length === 0) {
		res.redirect('/read?topic='+req.body.topic+'&alert=You probably want to say something here right now');
		return;
	}
	
	db.arguments.save(
    {
     topic: req.body.topic,
     id:    req.user.id, 
     name : req.user.username, 
     says : req.body.says},
		function (err, saved) {		
      if (err || !saved) { console.log("User not saved"); }    
      res.redirect('/read?topic='+req.body.topic);
    });
});


var server = require('http').createServer(app);
server.listen(8080);
