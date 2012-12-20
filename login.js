var passport = require('passport');
var conf = require("./config.js");   
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

passport.serializeUser(function(user, done)  { done(null, user); });
passport.deserializeUser(function(obj, done) { done(null, obj);  });


passport.use(new FacebookStrategy({
    clientID:     conf.FACEBOOK_APP_ID,
    clientSecret: conf.FACEBOOK_APP_SECRET,
    callbackURL:  "http://localhost:8080/fbcb"
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

app.get('/login', 
  function (req, res) {
    passport.authenticate('local', { failureRedirect : '/content/login.html', failureFlash : false }),
    function (req, res) {
      user_cache.token = req.user.token;
      res.redirect('/');
    }
  }
);


app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});