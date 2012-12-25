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
    res.redirect('/');
});


app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});