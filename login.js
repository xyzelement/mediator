var passport = require('passport');
var util = require('util');
var conf = require("./config.js");   
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

passport.serializeUser(function(user, done)  { done(null, user); });
passport.deserializeUser(function(obj, done) { done(null, obj);  });


passport.use(new FacebookStrategy({
    clientID:     conf.FACEBOOK_APP_ID,
    clientSecret: conf.FACEBOOK_APP_SECRET,
    callbackURL:  conf.CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, done) {
    profile.token = accessToken;
    return done(null, profile);
  }
));


passport.use(new LocalStrategy(
  function(username, password, done) {
    console.log("HI");
    
        
    conf.db.users.findOne({ email: username }, function (err, user) {
      //EMTODO: add password encryotpion
      if (err) { return done(err); }
      if (!user) { return done({message: "bad user"}, false); }
      if (user.password !== password) { return done({message: "bad password"}, false); }
      return done(null, user);
    });
  }
));


app.post('/add_email', function(req, res){
  //EMTODO: add password encryption
  //EMTODO: check for dupe emails
  console.log("* add_email " + req.body.username + " " + req.body.password);
  conf.db.users.save({email: req.body.username, password: req.body.password});
});

app.post('/login_email', 
function(req, res, next) {
    console.log('before authenticate');
    passport.authenticate('local', function(err, user) {
      console.log('authenticate callback');
      if (err) { return res.send({'status':'err','message':err.message}); }
      if (!user) { return res.send({'status':'fail','message':err.message}); }
      req.logIn(user, function(err) {
        if (err) { return res.send({'status':'err','message':err.message}); }
        console.log(util.inspect(req.user));
        return res.redirect('/');
      });
    })(req, res, next);
  },
  function(err, req, res, next) {
    // failure in login test route
    return res.send({'status':'err','message':err.message});
  });

app.get('/fb',
  passport.authenticate('facebook'),
  function(req, res){
    // The request will be redirected to Facebook for authentication, so this
    // function will not be called.
});

  
app.get('/fbcb', 
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    conf.log("LogIn: " + util.inspect(req.user.username 
                         + " " + req.user.id + " " + req.user.profileUrl));
                         
    conf.db.users.findOne({f_id: req.user.id}, function (err, user) {
      if (err || !user) {
      
      /*var obj = {     topic:        req.query["topic"],
                      topic :       topic,
                      user_id:      req.user.id,
                      users:        users,
                      whatever:     mediations.whatever};

      res.end(templates.convo_page(obj)); */
      
      
      
        res.redirect('/content/signup.html');        
      } else {
        res.redirect('/');
      }
    });
});


app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});