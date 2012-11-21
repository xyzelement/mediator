var users = require("./user_stuff");

var express = require("express");
app = express();

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

passport.serializeUser(function (user, done) { done(null, user.id);  });
passport.deserializeUser(function (id, done) { users.findById(id, function (err, user) { done(err, user); }); });

passport.use(new LocalStrategy(
		function (username, password, done) {
		users.findByUsername(username, function (err, user) {
			if (err)                       { return done(err); }
			if (!user)                     { return done(null, false, { message : 'Unknown user ' + username });}
			if (user.password != password) { return done(null, false, { message : 'Invalid password' }); }
			return done(null, user);
		})
	}));

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	res.redirect('/content/login.html')
}

app.get('/', ensureAuthenticated, function (req, res) {
	res.redirect('/user');
});

app.get('/login', //TODOfigure out this failureflash
	passport.authenticate('local', 
  { failureRedirect : '/content/login.html',
		failureFlash : false }),
	function (req, res) {
    res.redirect('/');
  }
);

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});


var db = require('./db');

app.get('/user', ensureAuthenticated, function (req, res) {
  db.load_topics_for_user(
    req.user.username,
    function(err)     {  console.log('error loading convo for user' + err) },
    function(entries) {  res.end(user_template({ topics       : entries,
                                                 alert        : req.query["alert"],
                                                 current_user : req.user.username    }));
    }
  );  
});


app.post('/start', ensureAuthenticated, function (req, res) {
  db.create_topic(
              req.user.username, // from
              req.body.with,     // to
              req.body.says,     // topic
              function(err) {
                res.redirect('/user?alert='+err);
              },
              function() {
                res.redirect('/read?topic='+req.body.says);                
              });
});


app.get('/read', ensureAuthenticated, function (req, res) {
  db.load_arguments_for_topic(req.query["topic"], 
    function (err) { 
      console.log("Failed to load convos:" + err);  
      res.redirect('/user');
    }, 
    function (entries) {
			var obj = {
        topic:        req.query["topic"],
				argument :    entries,
				alert :       req.query["alert"],
        current_user: req.user.username
			};
			res.end(convo_template(obj));
	});
});

app.get('/remove', ensureAuthenticated, function (req, res) {
  if (req.user.username != 'ed') {
    res.end("only ed can do this");
    return;
  }
  db.delete_everything( function() {res.redirect('/');}) ;

});

app.post('/add', ensureAuthenticated, function (req, res) {
  var conv = {
     topic: req.body.topic,
     id:    req.user.id, 
     name : req.user.username, 
     says : req.body.says  
  };

  db.add_argument(conv, 
      function (fail_text) {
        res.redirect('/read?topic='+req.body.topic+'&alert='+fail_text);
      },
      function (err, saved) {		
        if (err || !saved) { console.log("User not saved"); }    
        res.redirect('/read?topic='+req.body.topic);
      });
});


require('http').createServer(app).listen(8080);