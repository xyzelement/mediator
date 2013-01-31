var conf = require("./config.js");  

var templates  = require('./templates');
var express = require("express"); app = express();


var passport = require('passport');
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
var user       = require("./schema_user");
var mediation  = require('./schema_mediation');

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { 
    user.User.findOne({facebook_id: req.user.id}, function(err, usr) {
      if (err || !usr) {
        //EMTODO: crash here for now. what else can we do
        console.log("EMTODO: user not in DB?");
      }
      
      if (usr.needsMoreInfo()) {
          res.redirect('/account')
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


var mc = require("./controller_mediation")
app.get('/user', ensureAuthenticated, function (req, res) {
  mc.list_mediations(req,res);
});

app.post('/start', ensureAuthenticated, function (req, res) {
  mc.start_mediation(req, res);
});

app.get('/read', ensureAuthenticated, function (req, res) {
  mc.render_mediation(req, res);
});

app.post('/add_comment', ensureAuthenticated, function (req, res) {
  mc.add_comment(req, res);
});


//EMTODO: not authenticating here because that causes an infinite loop
//EMTODO: need 2 versions of ensureAuthenticated, one that checks
//        the database and one that does not!!!!
var ac = require("./controller_account") //EMTODO: move it

app.get('/account', /*ensureAuthenticated,*/ function(req, res) {
  ac.render_account(req, res);
});

app.post('/update_account', /*ensureAuthenticated,*/ function (req, res) {
  ac.update_account(req, res);
});


app.get('/start_with', ensureAuthenticated, function (req, res) {
  var w = req.query["with"];
  console.log("* /start with " + w);
  
  user.User.findById(req.session.user_id, function (err, creator) {
    if (err) console.log("Error finding user", req.session.user_id);
    user.User.findById(w, function (err, target) {
      if (err) console.log("Error finding user", w);
      res.end(templates.start_page({   creator:     creator,
                                       target:      target }));    
    })
  })
})


app.get('/start', ensureAuthenticated, function (req, res) {
  console.log("* /start(g) ");
  user.User.find({}, function(err, usrs) {
         res.end(templates.start_page({ users: usrs }))    
  });
});



app.get('/debug', function(req,res) { 
  conf.db.users.find( {}, function (err, out) { 
      console.log(out);
      res.end( util.inspect(out) ); }); 
});

app.get('/remove', /*ensureAuthenticated,*/ function (req, res) {
  //req.logout();
  conf.connection.collections.mediations.drop();
  //conf.connection.collections.users.drop();
  res.redirect('/');
});

server = require('http').createServer(app).listen(8080);