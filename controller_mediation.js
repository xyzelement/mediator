var mediation = require("./schema_mediation")
var templates  = require('./templates');


exports.list_mediations =  function (req, res) {
  console.log("* /user " + req.user.id)
  
  mediation.findMediationsForUser(req.session.user_id, function(err, mediations) {
      if(err) console.log("ERROR loading topics");
  
      res.end(templates.user_page({ 
        user         : req.session.user_id,
        topics       : mediations             }));  
  });
}

exports.start_mediation = function (req, res) {
  console.log("* /start(p) " + req.user.id + " " + req.body.with + " " + req.body.sumary);

  //EMTODO: second argument here should be the other user!
  mediation.startNew (req.session.user_id, req.session.user_id, 
                      req.body.summary, req.body.details,
                      function() {  
                        res.redirect("/user");
                        //EMTODO: res.redirect( facebook.get_fb_invite_url(req.body.with, req.body.summary, null) )                      
                      });
}

exports.render_mediation = function (req, res) {
  console.log("* /read " + req.query["topic"]);
  
  mediation.Mediation.findById(req.query["topic"], function (err, med) {
    console.log(err, med);
    var obj = {     user_id:      req.user.id,
                  mediation:      med
              };

    res.end(templates.convo_page(obj));    
  });
}

exports.add_comment = function (req, res) {
  console.log("* /add_comment " + req.body.topic + " " 
    + req.user.id + " " + req.body.says + " " + req.body.action);

  mediation.addCommentById(req.body.topic, req.session.user_id, req.body.says, req.body.action, 
    function () {
      res.redirect('/read?topic='+req.body.topic);
      //EMTODO: notify via web socket    
    });


}