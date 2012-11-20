var users = require("./user_stuff");

var express = require("express");
app = express();

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.session({
		secret : 'keyboard cat'
	}));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(__dirname + '/public'));

var data_template = "";
var fs = require('fs');
// TODO: you'll probably want to include an 'encoding' to fs.readFile (utf8 works)
// TODO: 'readFileSync'
fs.readFile(__dirname + '/public/content/second.html', function (err, data) {
	if (err) {
		throw err;
	}
	data_template = doT.template(data.toString());
});

var doT = require('dot')
	var db = require('mongojs').connect('mydb', ['arguments']);

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
	res.redirect('/content/first.html')
}

app.get('/', ensureAuthenticated, function (req, res) {
	res.redirect('/read');
});

app.get('/login', //TODOfigure out this failureflash
	passport.authenticate('local', {
		failureRedirect : '/content/first.html',
		failureFlash : false
	}),
	function (req, res) {
	res.redirect('/');
});

app.get('/read', ensureAuthenticated, function (req, res) {
	console.log(req.user);
	db.arguments.find({}, function (err, entries) {
		res.writeHead(200, {'Content-Type' : 'text/html',	'Trailer' : 'Content-MD5'	});
		
		if (err || !entries) {
			res.end("Oops. No data found");
		} else {
			var obj = {
				argument : entries,
				alert : req.query["alert"],
        current_user: req.user.username
			};
			res.end(data_template(obj));
		}
	});
});

app.post('/add', ensureAuthenticated, function (req, res) {
	if (req.body.name.length === 0 || req.body.says.length === 0) {
		res.redirect('/read?alert=You probably want to say something here right now');
		return;
	}
	
	db.arguments.save(
    {name : req.body.name, says : req.body.says},
		function (err, saved) {		
      if (err || !saved) { console.log("User not saved"); }    
      res.redirect('/read');
    });
});

//app.listen(8080);
var server = require('http').createServer(app);
server.listen(8080);
