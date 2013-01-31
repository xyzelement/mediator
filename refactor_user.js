var mongoose = require('mongoose');
var util = require("util");

mongoose.connect('mongodb://localhost/test'); //EMTODO: standardize db access?

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));





function saveShit() {
    var plaintif = new exports.User({ facebook_id: "12345",
                                      display_name: "Ed",
                                      email: "ed@ed.com"
                                   });
                                   
    var defendent = new exports.User({ facebook_id: "abcd",
                                       display_name: "Yelena",
                                       email: "yn@nags.com"
                                    });
    
    console.log(util.inspect( plaintif)); 
    
    plaintif.save( function() {
    defendent.save( function () {
    
    var mediation = new exports.Mediation({                                
                                  _creator:       plaintif,                                
                                  defendent_id:   defendent
                        });

    console.log(mediation.toString(),"\n");
    
    mediation.addComment(new exports.Comment({
                                    user:   plaintif,
                                    text:   "We got an issue bro",
                                    action: "Start"
                        }));
    
    console.log(mediation.toString(),"\n");
      
    mediation.addComment(new exports.Comment({
                          user:      defendent,
                          text:      "What is our issue?",
                          action:    "Question"
                        }));
    
    console.log(mediation.toString(), "\n\n");
    
    mediation.save(function(err,com) { console.log("Saved:" + err + " " + com) }) ; return;
     }) })
    
}
  



db.once('open', function callback () {
  

  // USER
  var userSchema = mongoose.Schema({
    facebook_id:  {type: String, /*unique: true*/},
    display_name: String,
    email:        String,
  });

  userSchema.methods.getPictureUrl = function () {
    return 'https://graph.facebook.com/'+this.facebook_id+'/picture'
  }
  
  userSchema.methods.needsMoreInfo = function () {
    return this.email == undefined;
  }
  
  userSchema.methods.toString = function () {
    return this.display_name + " (" + this.facebook_id + ") "//+ (this.email ? this.email : "");
  }

  userSchema.methods.sameUser = function(usr) { //EMTODO: is this the right way to compare?
    return this._id === usr._id;
  }
  
  exports.User = mongoose.model('User', userSchema);
  
  // COMMENT
  var commentSchema = mongoose.Schema({
    user:     {type: mongoose.Schema.ObjectId, ref: 'User'},
    action:    String,
    text:      String
  });
  
  commentSchema.methods.toString = function() {
    return this.user + ": [" + this.action + "] " + this.text;
  }
  
  exports.Comment = mongoose.model('Comment', commentSchema);
  
  
  // MEDIATION
  var mediationSchema = mongoose.Schema({
    _creator:      {type: mongoose.Schema.ObjectId, ref: 'User'},
    defendent_id:  {type: mongoose.Schema.ObjectId, ref: 'User'},
    next_to_speak: String,
    state:         String,
    comments:      [commentSchema],
    topic:         String,
  });
  
  mediationSchema.methods.addComment = function(comment) {
  
    // Identify who will be next to speak
    if      (comment.user.equals(this._creator))       this.next_to_speak = "defendent";
    else if (comment.user.equals(this.defendent_id))   this.next_to_speak = "plaintif";
    else    console.log("ERROR: who's this comment by", comment.user)

    // Identify the state of the mediation
    switch (comment.action) {
    case "Start"    : this.state = "Alleged";    break;
    case "Restate"  : this.state = "Restated";   break;
    case "Question" : this.state = "Questioned"; break;
    case "Clarify"  : this.state = "Alleged";    break;
    case "Accept"   : this.state = "Accepted";   break;
    default         : console.log("ERROR: unknown action: " + comment.action);
    }    
      
    this.comments.push(comment);
  }
  
  mediationSchema.methods.nextActions = function () {
    return ["Blow me", "Not gonna blow you"];
  }
  
  mediationSchema.methods.toString = function() {
    var out = this._creator + " vs. " + this.defendent_id + ". [" + this.state + "] " + this.next_to_speak + "\n";
    for (i = 0; i < this.comments.length; i++) {
      out += "\t" + this.comments[i].toString() + "\n"
    }
    return out;
  }
   
  exports.Mediation = mongoose.model('Mediation', mediationSchema);

  exports.findMediationsForUser(new mongoose.Types.ObjectId("5109f552046fa5d415000002"));
  
  // Everything bellow this is the test driver.
  //saveShit(); 
  return;
  
  
  
  exports.User.findOne({display_name: "Ed"}, function(err, usr) {
    exports.Mediation
      .findOne({ _creator: usr})
      //.populate('_creator')
      //.populate('defendent_id')
      //.populate('comments.user')
      .exec(function(err, mediations) {
        mediations.addComment( new exports.Comment({
                                    user:   usr,
                                    text:   "dude you KNOW what I mean",
                                    action: "Clarify" })  );
        console.log(mediations.toString(), "\n\n");
        mediations.save();
  });

    });
  return;
});

//EMTODO: can this be part of the schema?
exports.findMediationsForUser = function(user, cb) {
  exports.Mediation.find()
  .or([{ _creator: user }, { _defendent_id: user }])
  //.select("_creator defendent_id topic state next_to_speak")
  .populate('_creator')
  .populate('defendent_id')
  .exec(cb);
}




