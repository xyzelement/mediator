var passport = require('passport');
var util = require('util');
var conf = require("./config.js");   
var templates = require("./templates.js");
var FacebookStrategy = require('passport-facebook').Strategy;
var user = require("./refactor_user");

passport.serializeUser(function(user, done)  { done(null, user); });
passport.deserializeUser(function(obj, done) { done(null, obj);  });


passport.use(new FacebookStrategy({
    clientID:     conf.FACEBOOK_APP_ID,
    clientSecret: conf.FACEBOOK_APP_SECRET,
    callbackURL:  conf.CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, done) {
    console.log("Called back from fb ");
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
  
    conf.log("LogIn: " + util.inspect(req.user.username 
                         + " " + req.user.id + " " + req.user.profileUrl));
  
    var regular1 = new user.User({ facebook_id: req.user.id,
                                  display_name: req.user.displayName,
                                });

    //EMTODO: the intention here is that if the user already exists, this save will
    //fail. There's got to be a nicer way of doing that.
    regular1.save(function(err, usr) { if (err) console.log("Error saving: " + err); });
                                
    res.redirect('/');
});


app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});