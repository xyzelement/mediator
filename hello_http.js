var express = require("express");
app = express(); 

var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

 
//Todo: figure out what all of these actually are 
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.session({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(__dirname + '/public'));


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


passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  findById(id, function (err, user) {
    done(err, user);
  });
});

  
var users = [
    { id: 1, username: 'bob', password: 'secret', email: 'bob@example.com' }
  , { id: 2, username: 'joe', password: 'birthday', email: 'joe@example.com' }
  , { id: 3, username: 'ed', password: 'ed', email: 'ed@example.com' }
  ];

function findById(id, fn) {
  var idx = id - 1;
  if (users[idx]) {
    fn(null, users[idx]);
  } else {
    fn(new Error('User ' + id + ' does not exist'));
  }
}

function findByUsername(username, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
    if (user.username === username) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}  
  
passport.use(new LocalStrategy(
  function(username, password, done) {
    process.nextTick(function () {
      
      findByUsername(username, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
        if (user.password != password) { return done(null, false, { message: 'Invalid password' }); }
        return done(null, user);
      })
    });
  }
));
  

  
 app.get('/', ensureAuthenticated, function(req, res){
  res.redirect('/read');
});
  

  
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/content/first.html')
}  
  
//TODOfigure out this failureflash  
app.get('/login', 	
  passport.authenticate('local', { failureRedirect: '/content/first.html', 
								   failureFlash: false }),  
								   function(req, res) {
										res.redirect('/');
								  });

app.get('/read', function (req, res) {    
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
		res.redirect('/read?alert=You probably want to say something here right now');
		return;
	}

	db.arguments.save({name: req.body.name, says: req.body.says}, 
		function(err, saved) {
			if( err || !saved ) console.log("User not saved");
			res.redirect('/read');
		});
});

app.listen(8080);