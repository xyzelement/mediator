var facebook   = require("./facebook");
var user_cache = require("./user_cache");
var templates  = require('./templates');
var express = require("express");
app = express();

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
  m.add(req.user.id, req.body.says);
  m.save();

  //EMTODO: put this in callback?
  res.redirect( facebook.get_fb_invite_url(req.body.with, req.body.says, null) ); 
});


app.get('/read', ensureAuthenticated, function (req, res) {
  console.log("* /read " + req.query["topic"]);
  
  mediations.load(req.query["topic"], function(topic) { 
    user_ids  = [topic.from, topic.to]; //make sure to always have our own user object

    user_cache.create_user_data(req.user.token, user_ids, {} , function(users) { 

      var obj = {   topic:        req.query["topic"],
                      argument :    topic.arguments,
                      alert :       req.query["alert"],
                      user_id:      req.user.id,
                      users:        users         };
      console.log(util.inspect(obj, true, 100, true));
      res.end(templates.convo_page(obj)); 
    });
  });
});

function next_status(topic_id, updated_id, cb) {
    db.load_topic(topic_id, function(topic) {
      var byA = (topic.from === updated_id);
   
      var new_status;
   
      console.log("cur stat: " + util.inspect(topic));
      if (topic.status === "Alleged") {console.log("WTF!");}
      switch (topic.status) {
        case "Alleged":
          console.log("Now: alelged");
          new_status = (byA ? "Alleged1" : "Responded");
          break;
        case "Responded":
          console.log("Now: respon ded");
          new_status = (byA ? "XXX" : "Responded1");
        default:
          break;
      }
      
      if (new_status && new_status !== topic.status) {
        db.update_topic_status(topic_id, new_status, cb);
      } else {
        console.log("-   No change in status");
        cb();
      }
  });
}

app.post('/add_comment', ensureAuthenticated, function (req, res) {
  console.log("* /add_comment " + req.body.topic + " " + req.user.id + " " + req.body.says);

  mediations.load(req.body.topic, function(topic) {
    topic.add(req.user.id, req.body.says);
    topic.save();
  });
 
  //EMTODO: put this in callback? 
  res.redirect('/read?topic='+req.body.topic);
});

require('http').createServer(app).listen(8080);