var templates  = require('./templates');
var express = require("express");
app = express();

var user_cache = require("./user_cache");
var facebook   = require("./facebook");


var passport = require('passport');
var db = require('./db');
var mediations = require('./mediation');
var util  = require("util");

app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.session({secret : 'keyboard cat'}));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(__dirname + '/public'));

var login = require("./login");
var aux = require("./auxilary");

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	res.redirect('/content/login.html')
}

app.get('/', ensureAuthenticated, function (req, res) {
	res.redirect('/user');
});


app.get('/user', ensureAuthenticated, function (req, res) {
  console.log("* /user " + req.user.id);
  
  mediations.list(req.user.id, function(meds) {  
    user_ids = [req.user.id];
    for (i=0; i<meds.length; ++i) {
      user_ids.push( meds[i].from );
      user_ids.push( meds[i].to   );
    }

    user_cache.create_user_data(req.user.token, user_ids, {} ,function(users) { 
      res.end(templates.user_page({ 
        user_id      : req.user.id,
        topics       : meds,
        alert        : req.query["alert"],
        users        : users }));
    });
  });
});


app.get('/start', ensureAuthenticated, function (req, res) {
  var w = req.query["with"];
  console.log("* /start(g) " + w);
  if (!w) {
    facebook.getFbFriends(req.user.token, req.user.id, function(friend_str) { 
      user_cache.create_user_data(req.user.token, [req.user.id], {}, function(users) {
        res.end(templates.start_page({ user_id:    req.user.id,
         users:      users,
         friends:    friend_str})) 
      });
    });
  } else {
    facebook.getUserProfile(req.user.token, w, function(target) {  
      user_cache.create_user_data(req.user.token, [req.user.id, target.id], {}, function(users) {
        res.end(templates.start_page({ users:       users,
         user_id:     req.user.id,
         target_id:   target.id }));
      });
    });
  }});


app.post('/start', ensureAuthenticated, function (req, res) {
  console.log("* /start(p) " + req.user.id + " " + req.body.with + " " + req.body.says);

  var m = new mediations.Mediation();
  m.from = req.user.id;
  m.to   = req.body.with;
  m.subject = req.body.says;

  m.add(req.user.id, "Alleged", req.body.says);
  m.save();

  //EMTODO: put this in callback?
  res.redirect( facebook.get_fb_invite_url(req.body.with, req.body.says, null) ); 
});


app.get('/read', ensureAuthenticated, function (req, res) {
  console.log("* /read " + req.query["topic"]);
  
  mediations.load(req.query["topic"], function(topic) { 
    user_ids  = [topic.from, topic.to]; //make sure to always have our own user object

    user_cache.create_user_data(req.user.token, user_ids, {} , function(users) { 

      var obj = {   topic:          req.query["topic"],
                      topic :       topic,
                      alert :       req.query["alert"],
                      user_id:      req.user.id,
                      users:        users         };

      res.end(templates.convo_page(obj)); 
    });
  });
});


app.post('/add_comment', ensureAuthenticated, function (req, res) {
  console.log("* /add_comment " + req.body.topic + " " + req.user.id + " " + req.body.says + " " + req.body.action);

  mediations.load(req.body.topic, function(topic) {
    topic.add(req.user.id, req.body.action, req.body.says);
    topic.save();
  });
 
  //EMTODO: put this in callback? 
  res.redirect('/read?topic='+req.body.topic);
});

require('http').createServer(app).listen(8080);