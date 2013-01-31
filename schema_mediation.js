var mongoose = require('mongoose');
var util = require("util");

exports.addSchema = function () {
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
  
}

//EMTODO: can this be part of the schema?
exports.findMediationsForUser = function(user, cb) {
  exports.Mediation.find()
  .or([{ _creator: user }, { _defendent_id: user }])
  .populate('_creator')
  .populate('defendent_id')
  .exec(cb);
}

exports.findMediationById = function(id, cb) {
  exports.Mediation.findById(id)
  .populate('_creator')
  .populate('defendent_id')
  .populate('comments.user')
  .exec(cb);
}

exports.addCommentById = function (mediation_id, user_id, text, action, cb) {

  var comment = new exports.Comment({  user:   user_id,
                                       text:   text,
                                       action: action         });
  
  exports.Mediation.findByIdAndUpdate(mediation_id, 
    { $push: { comments: comment }}, 
    function(err,med) {
      if (err) 
        console.log("Error adding comment: ", mediation_id, user_id, text, action)
      cb();
    });
}

exports.startNew = function(creator_id, defendent_id, topic, text, cb) {
  var med =  new exports.Mediation({ _creator:       creator_id,
                                       topic:          topic,
                                       defendent_id:   defendent_id   });

  med.addComment( new exports.Comment({ user:   creator_id,
                                       text:   text,
                                       action: "Start"                    }));
  med.save( function (err, meds) { 
    if (err) console.log("Error Starting Mediation: ", err, meds); 
    cb();
  });                                       
}