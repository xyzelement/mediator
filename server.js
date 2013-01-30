var conf = require("./config.js");  

var templates  = require('./templates');
var express = require("express"); app = express();

var user_cache = require("./user_cache");
var facebook   = require("./facebook");


var passport = require('passport');
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
var user = require("./refactor_user");

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { 
    user.User.findOne({facebook_id: req.user.id}, function(err, usr) {
      if (err || !usr) {
        //EMTODO: crash here for now. what else can we do
        console.log("EMTODO: user not in DB?");
      }
      
      if (usr.needsMoreInfo()) {
        res.end(templates.account_page({  user         : usr  }));
      } else {       
        return next(); 
      }
    });
  } else {
    res.redirect('/content/login.html')
  }
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


app.get('/signup', function (req, res) {
  res.end(templates.signup_page({ 
    user: { facebook_id: 12345,
            name: "Ed Hard Coded"
          }
  })) 
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
  m.subject = req.body.summary;

  m.add(req.user.id, "Start", req.body.details);
  m.save();

  //EMTODO: put this in callback?
  res.redirect( facebook.get_fb_invite_url(req.body.with, req.body.summary, null) ); 
});


app.get('/read', ensureAuthenticated, function (req, res) {
  console.log("* /read " + req.query["topic"]);
  
  mediations.load(req.query["topic"], function(topic) { 
    user_ids  = [topic.from, topic.to]; //make sure to always have our own user object

    user_cache.create_user_data(req.user.token, user_ids, {} , function(users) { 

      var obj = {     topic:        req.query["topic"],
                      topic :       topic,
                      user_id:      req.user.id,
                      users:        users,
                      whatever:     mediations.whatever};

      res.end(templates.convo_page(obj)); 
    });
  });
});

app.get('/account', ensureAuthenticated, function(req, res) {
 user.User.findOne({facebook_id: req.user.id}, function(err, usr) {
      if (err || !usr) {
        //EMTODO: crash here for now. what else can we do
        console.log("EMTODO: user not in DB?");
      }
      
      res.end(templates.account_page({  user         : usr  }));
  }); 
});

//EMTODO: not authenticating here because that causes an infinite loop
//EMTODO: need 2 versions of ensureAuthenticated, one that checks
//        the database and one that does not!!!!
app.post('/update_account', /*ensureAuthenticated,*/ function (req, res) {
  console.log("Update account, looking for: " + req.user.id);
  user.User.findOneAndUpdate({facebook_id: req.user.id}, 
                             {display_name: req.body.display_name, email: req.body.email},
                             function (err, usr) {
                              console.log("Updated: " + err + " " + usr); 
                              res.redirect('/account');
                             });
});

app.post('/add_comment', ensureAuthenticated, function (req, res) {
  console.log("* /add_comment " + req.body.topic + " " + req.user.id + " " + req.body.says + " " + req.body.action);

  mediations.load(req.body.topic, function(topic) {
    topic.add(req.user.id, req.body.action, req.body.says);
    topic.save();
  });
 
  //EMTODO: this should be more targeted!
  io.sockets.emit('refresh', { hello: 'world' });
   
  //EMTODO: put this in callback? 
  res.redirect('/read?topic='+req.body.topic);
});


app.get('/debug', function(req,res) { 
  conf.db.users.find( {}, function (err, out) { 
      console.log(out);
      res.end( util.inspect(out) ); }); 
});

app.get('/remove', /*ensureAuthenticated,*/ function (req, res) {
  conf.db.mediations.remove();
  conf.db.users.remove();
  res.redirect('/');
});

server = require('http').createServer(app).listen(8080);

var io = require('socket.io').listen(server);


//EMTODO: register sessions
io.sockets.on('connection', function (socket) {
  console.log("Someone connected" + util.inspect(socket.handshake, true, 100, true));  
});


