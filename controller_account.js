var templates  = require('./templates');
var user = require("./schema_user")


exports.render_account = function(req, res) {
 user.User.findOne({facebook_id: req.user.id}, function(err, usr) {
      if (err || !usr) {
        //EMTODO: crash here for now. what else can we do
        console.log("EMTODO: user not in DB?");
      }
      
      res.end(templates.account_page({  user         : usr  }));
  }); 
}

exports.update_account = function (req, res) {
  console.log("Update account, looking for: " + req.user.id);
  user.User.findOneAndUpdate({facebook_id: req.user.id}, 
                             {display_name: req.body.display_name, email: req.body.email},
                             function (err, usr) {
                              console.log("Updated: " + err + " " + usr); 
                              res.redirect('/');
                             });
}