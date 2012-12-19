//TODO: completely rethink the user_oject model for passing that stuff around


var conf = require("./config.js");    
var facebook = require("./facebook");
var user_cache = require("./user_cache");

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
var start_template = "";

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

fs.readFile(__dirname + '/public/content/start.html', function (err, data) {
	if (err) { throw err; }
	start_template = doT.template(data.toString());
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
	res.redirect('/user');
});


app.get('/login', //TODOfigure out this failureflash
	function (req, res) {
	passport.authenticate('local', 
  { failureRedirect : '/content/login.html',
		failureFlash : false }),
	function (req, res) {
    user_cache.token = req.user.token;
    res.redirect('/');
  }
	}
);


app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});


var db = require('./db');

app.get('/user', ensureAuthenticated, function (req, res) {
  console.log("* /user " + req.user.id);
  
  db.load_topics_for_user(
      req.user.id,
      function(err)     {  console.log('error loading convo for user' + err) },
      function(entries) {  
          user_ids = [req.user.id];
          for (i=0; i<entries.length; ++i) {
            user_ids.push( entries[i].from );
            user_ids.push( entries[i].to   );
          }
      
          user_cache.create_user_data(req.user.token, user_ids, {} ,function(users) { 
          
            res.end(user_template({ 
              user_id      : req.user.id,
              topics       : entries,
              alert        : req.query["alert"],
              users        : users
            }));
          });
      })
});

 
app.get('/start', ensureAuthenticated, function (req, res) {
  var w = req.query["with"];
  console.log("* /start(g) " + w);
  if (!w) {
    facebook.getFbFriends(req.user.token, req.user.id, function(friend_str) { 

      user_cache.create_user_data(req.user.token, [req.user.id], {}, function(users) {
      
        res.end(start_template({ user_id:    req.user.id,
                                 users:      users,
                                 friends:    friend_str})) 
      });
    });
  } else {
    facebook.getUserProfile(req.user.token, w, function(target) {  
      user_cache.create_user_data(req.user.token, [req.user.id, target.id], {}, function(users) {
        res.end(start_template({ 
                                  users:       users,
                                  user_id:     req.user.id,
                                  target_id:   target.id }));
    });
  });
}});


app.post('/start', ensureAuthenticated, function (req, res) {
  console.log("* /start(p) " + req.user.id + " " + req.body.with + " " + req.body.says);
  db.create_topic(
              req.user.id, // from
              req.body.with,     // to
              req.body.says,     // topic
              function(err) {
                res.redirect('/user?alert='+err);
              },
              function() {
                //EMTODO: Perhaps first 'salvo' should be different than topic.
                db.add_argument(req.body.says, req.user.id, req.body.says,
                function (fail_text) {
                  res.redirect('/read?topic='+req.body.topic+'&alert='+fail_text);
                },
                function () {		        
                  res.redirect(  facebook.get_fb_invite_url(req.body.with/*'ed.markovich'*/, req.body.says) );
                });
              });
});


app.get('/read', ensureAuthenticated, function (req, res) {
  console.log("* /read " + req.query["topic"]);
  
  db.load_arguments_for_topic(req.query["topic"], 
    function (err) { 
      console.log("Failed to load convos:" + err);  
      res.redirect('/user'); }, 
    function (entries) {
      user_ids  = [req.user.id]; //make sure to always have our own user object
      for (i=0; i<entries.length; ++i) {
        user_ids.push(entries[i].user_id);
      }
    
      user_cache.create_user_data(req.user.token, user_ids, {} ,function(users) { 
      
        var obj = {
          topic:        req.query["topic"],
          argument :    entries,
          alert :       req.query["alert"],
          user_id:      req.user.id,
          users:        users
        };
        
        res.end(convo_template(obj)); 
      });
	});
});


app.post('/add_comment', ensureAuthenticated, function (req, res) {
  //EMTODO: support idea of who this is said TO
  console.log("* /add_comment " + req.body.topic + " " + req.user.id + " " + req.body.says);
  db.add_argument(req.body.topic, req.user.id, req.body.says,
      function (fail_text) {
        res.redirect('/read?topic='+req.body.topic+'&alert='+fail_text);
      },
      function () {		        
        res.redirect('/read?topic='+req.body.topic);
      });
});

app.get('/debug', function(req,res) { 
  db.get_debug( function(out) { res.end( util.inspect(out) ); }); 
});

app.get('/remove', ensureAuthenticated, function (req, res) {
  if (req.user.username != 'ed.markovich') {
    res.end("only ed can do this");
    return;
  }
  db.delete_everything( function() {res.redirect('/');}) ;
});


require('http').createServer(app).listen(8080);