var facebook   = require("./facebook");
var user_cache = require("./user_cache");
var templates  = require('./templates');

var express = require("express");
app = express();

var passport = require('passport');
var db = require('./db');

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
        res.end(templates.user_page({ 
          user_id      : req.user.id,
          topics       : entries,
          alert        : req.query["alert"],
          users        : users }));
      });
    })
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
  db.create_topic(
              req.user.id,       // from
              req.body.with,     // to
              req.body.says,     // topic
              function(err) {  res.redirect('/user?alert='+err);   },
              function()    {
                db.add_argument(req.body.says, req.user.id, req.body.says,
                  function (fail_text) {  res.redirect('/read?topic='+req.body.topic+'&alert='+fail_text);  },
                  function ()          {	res.redirect( facebook.get_fb_invite_url(req.body.with, req.body.says) );  });
              });
});


app.get('/read', ensureAuthenticated, function (req, res) {
  console.log("* /read " + req.query["topic"]);
  
  db.load_arguments_for_topic(req.query["topic"], 
    function (err) {  console.log("Failed to load convos:" + err);  res.redirect('/user'); }, 
    function (entries) {  
      user_ids  = [req.user.id]; //make sure to always have our own user object
      for (i=0; i<entries.length; ++i) {
        user_ids.push(entries[i].user_id);
      }

      user_cache.create_user_data(req.user.token, user_ids, {} , function(users) { 

        var obj = {   topic:        req.query["topic"],
                      argument :    entries,
                      alert :       req.query["alert"],
                      user_id:      req.user.id,
                      users:        users         };
        res.end(templates.convo_page(obj)); 
      });
    });
});

app.post('/add_comment', ensureAuthenticated, function (req, res) {
  console.log("* /add_comment " + req.body.topic + " " + req.user.id + " " + req.body.says);
  db.add_argument(req.body.topic, req.user.id, req.body.says,
    function (fail_text) { res.redirect('/read?topic='+req.body.topic+'&alert='+fail_text);  },
    function ()          { res.redirect('/read?topic='+req.body.topic);                      });
});

require('http').createServer(app).listen(8080);