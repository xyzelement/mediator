var users = require("./user_stuff");
var conf = require("./config.js");
var util = require("util");
var express = require("express");
app = express();

var facebook = require('./facebook');
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
    res.redirect('/');
  }
	}
);

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});


var db = require('./db');

function getUserProfile(token, user_id, done) {
  facebook.get(token, '/'+user_id, 
    function(data) {
      var obj = JSON.parse(data);
      done(obj);
    });
}

function getFbFriends(token, user_id, done) {
  facebook.get(token, '/'+user_id+'/friends', 
    function(data){
        var obj = JSON.parse(data);
        function compare(a,b) {
          var a = a.name.toLowerCase();
          var b = b.name.toLowerCase();
          if (a < b) return -1;
          if (a > b) return  1;
          return 0;
    }

        obj.data.sort(compare);
        //done(obj.data);
        var last = "!";
        var out2 = { };
        
        for (var i = 0; i < obj.data.length; ++i) {
          var c = obj.data[i].name.substring(0,1);
          if (c !== last) {
            out2[c] = [];
            last =c ;
          }
          
          out2[c].push(obj.data[i]);
        }
        
        done(out2);
    });
}

function get_fb_invite_url(user_to_invite, topic) {
  return 'https://www.facebook.com/dialog/apprequests?%20app_id='
          + conf.FACEBOOK_APP_ID
          +'&%20message=I am using Mediator to discuss an issue with you: ' 
          + topic 
          +'.&%20redirect_uri=http://localhost:8080/read?topic='
          + topic 
          + '&to=' + user_to_invite
}


app.get('/user', ensureAuthenticated, function (req, res) {
    //EMTOOD: use user_id not name
    console.log("* /user " + req.user.username);
    db.load_topics_for_user(
      req.user.username,
      function(err)     {  console.log('error loading convo for user' + err) },
      function(entries) {  res.end(user_template({ 
                                                 user         : req.user,
                                                 topics       : entries,
                                                 alert        : req.query["alert"],
                                                 current_user : req.user.username
                                                 }));
    });
});
 
app.get('/start', ensureAuthenticated, function (req, res) {
  var w = req.query["with"];
  console.log("* /start(g) " + w);
  if (!w) {
    getFbFriends(req.user.token, req.user.id, function(friend_str) {  
      res.end(start_template({ user:    req.user,
                               friends: friend_str}));
    });
  } else {
    getUserProfile(req.user.token, w, function(profile) {  
      res.end(start_template({ user:    req.user,
                               profile: profile}));
    });
  }
});


app.post('/start', ensureAuthenticated, function (req, res) {
  console.log("* /start(p) " + req.user.username + " " + req.body.with + " " + req.body.says);
  //EMTOOD: use my ID rather than user name
  db.create_topic(
              req.user.username, // from
              req.body.with,     // to
              req.body.says,     // topic
              function(err) {
                res.redirect('/user?alert='+err);
              },
              function() {
                //EMTODO: Perhaps first 'salvo' should be different than topic.
                //EMTODO: the first argument doesn't seem to actually save?
                db.add_argument(req.body.says, req.user.username, req.body.says,
                function (fail_text) {
                  res.redirect('/read?topic='+req.body.topic+'&alert='+fail_text);
                },
                function () {		        
                  res.redirect(  get_fb_invite_url('ed.markovich', req.body.says) );
                });
              });
});


app.get('/read', ensureAuthenticated, function (req, res) {
  //EMTODO: support the idea of who the conversation is to/from
  console.log("* /read " + req.query["topic"]);
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


app.post('/add_comment', ensureAuthenticated, function (req, res) {
  //EMTODO: use id not username
  //EMTODO: support idea of who this is said TO
  console.log("* /add_comment " + req.body.topic + " " + req.user.username + " " + req.body.says);
  db.add_argument(req.body.topic, req.user.username, req.body.says,
      function (fail_text) {
        res.redirect('/read?topic='+req.body.topic+'&alert='+fail_text);
      },
      function () {		        
        res.redirect('/read?topic='+req.body.topic);
      });
});


app.get('/remove', ensureAuthenticated, function (req, res) {
  if (req.user.username != 'ed.markovich') {
    res.end("only ed can do this");
    return;
  }
  db.delete_everything( function() {res.redirect('/');}) ;
});

require('http').createServer(app).listen(8080);