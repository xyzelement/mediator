var users = require("./user_stuff");
var conf = require("./config.js");
var util = require("util");
var express = require("express");
app = express();

var util = require('util');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

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

passport.serializeUser(function(user, done)  { done(null, user); });
passport.deserializeUser(function(obj, done) { done(null, obj);  });





passport.use(new FacebookStrategy({
    clientID: conf.FACEBOOK_APP_ID,
    clientSecret: conf.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:8080/fbcb"
  },
  function(accessToken, refreshToken, profile, done) {
    profile.token = accessToken;
    return done(null, profile);
  }
));


app.get('/fb',
  passport.authenticate('facebook'),
  function(req, res){
    // The request will be redirected to Facebook for authentication, so this
    // function will not be called.
  });

app.get('/fbcb', 
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	res.redirect('/content/login.html')
}

app.get('/', ensureAuthenticated, function (req, res) {
	console.log("/ called");
	res.redirect('/user');
});

app.get('/login', //TODOfigure out this failureflash
	function (req, res) {
	console.log("login called");
	passport.authenticate('local', 
  { failureRedirect : '/content/login.html',
		failureFlash : false }),
	function (req, res) {
    res.redirect('/');
  }
	}
);

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});


var db = require('./db');


function getFbFriends(token, user_id, done) {
  var facebook = require('./facebook');
  facebook.get(token, '/'+user_id+'/friends', 
    function(data){
        var obj = JSON.parse(data);
        var out = "[";
        for (var i=0; i<obj.data.length; i++) {
          if (i !== 0) { out += ", "; }
          out += " \"" + obj.data[i].name.replace("'","") + "\" ";
        }
        out += "]";
        done(out);
    });
}

app.get('/user', ensureAuthenticated, function (req, res) {

  getFbFriends(req.user.token, req.user.id, function(friend_str) {

    console.log(req.user);
  
    db.load_topics_for_user(
    req.user.username,
    function(err)     {  console.log('error loading convo for user' + err) },
    function(entries) {  res.end(user_template({ 
                                                 user         : req.user,
                                                 topics       : entries,
                                                 alert        : req.query["alert"],
                                                 current_user : req.user.username,
                                                 friends      : friend_str }));
    });
  });
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
                db.add_argument(req.body.says, req.user.username, req.body.says,
                function (fail_text) {
                  res.redirect('/read?topic='+req.body.topic+'&alert='+fail_text);
                },
                function () {		        
                  res.redirect('/read?topic='+req.body.says);
                });
              });
});


app.get('/read', ensureAuthenticated, function (req, res) {
  console.log("read called");
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
  db.add_argument(req.body.topic, req.user.username, req.body.says,
      function (fail_text) {
        res.redirect('/read?topic='+req.body.topic+'&alert='+fail_text);
      },
      function () {		        
        res.redirect('/read?topic='+req.body.topic);
      });
});


require('http').createServer(app).listen(8080);