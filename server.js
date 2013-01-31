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
        req.session.user_id = usr._id;
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
  console.log("* /user " + req.user.id)
  
  user.findMediationsForUser(req.session.user_id, function(err, mediations) {
      if(err) console.log("ERROR loading topics");
  
      res.end(templates.user_page({ 
        user         : req.session.user_id,
        topics       : mediations,
        alert        : req.query["alert"],
        }));  
  });
});

/*
app.get('/signup', function (req, res) {
  res.end(templates.signup_page({ 
    user: { facebook_id: 12345,
            name: "Ed Hard Coded"
          }
  })) 
});
*/

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
  console.log("* /start(p) " + req.user.id + " " + req.body.with + " " + req.body.sumary);

  var med =  new user.Mediation({ _creator:       req.session.user_id,
                                  topic:          req.body.summary,
                                  defendent_id:   req.session.user_id,  //EMTODO: for now  
                                });
                                
  med.addComment( new user.Comment({ user:   req.session.user_id,
                                     text:   req.body.details,
                                     action: "Start" })  );

  med.save( function (err, meds) { 
    if (err) console.log("Error Saving", err, meds); 
    res.redirect("/user");
    //EMTODO: res.redirect( facebook.get_fb_invite_url(req.body.with, req.body.summary, null) ); 
  });
  
  

  
});


app.get('/read', ensureAuthenticated, function (req, res) {
  console.log("* /read " + req.query["topic"]);
  
  user.Mediation.findById(req.query["topic"], function (err, med) {
    console.log(err, med);
    var obj = {     user_id:      req.user.id,
                  mediation:      med
              };

    res.end(templates.convo_page(obj));    
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

  var comment = new user.Comment({  user:   req.session.user_id,
                                    text:   req.body.says,
                                    action: req.body.action         });
  
  user.Mediation.findByIdAndUpdate(req.body.topic, { $push: { comments: comment }}, function(err,med) {
    console.log("Added comment: ", err, med);
    res.redirect('/read?topic='+req.body.topic);
    //EMTODO: notify via web socket
  });;

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


