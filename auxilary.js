var util = require("util");
var db = require('./db');

app.get('/debug', function(req,res) { 
  db.get_debug( function(out) { res.end( util.inspect(out) ); }); 
});

app.get('/remove', /*ensureAuthenticated,*/ function (req, res) {
  //if (req.user.username != 'ed.markovich') {
    //res.end("only ed can do this");
    //return;
  //}
  db.delete_everything( function() {res.redirect('/');}) ;
});