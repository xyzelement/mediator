var mongoose = require('mongoose');
var util = require("util");

function stateFromAction(action) {
    switch (action) {
    case "Start"    : return "Alleged";    
    case "Restate"  : return "Restated";   
    case "Question" : return "Questioned"; 
    case "Clarify"  : return "Alleged";    
    case "Accept"   : return "Accepted";   
    default         : console.log("ERROR: unknown action: " + comment.action);
    }  
}

var action_labels = {
  "Start" :    { "Recap"   : "started a mediation",
                 "Button"  : "You should never see this button!",
                 "Command" : "You should never see this info!"},
  "Restate" :  { "Recap"   : "restated the issue in their own words",
                 "Button"  : "I think I understand",
                 "Command" : "In order to make sure you are talking about the same thing, please restate the issue in your own words." },
  "Question" : { "Recap"   : "requested more information",
                 "Button"  : "I need to know more",
                 "Command" : "It's great that you need more information. Please be as specific as possible about what you require." },
  "Clarify" :  { "Recap"   : "provided more information",
                 "Button"  : "Let me clarify",
                 "Command" : "Please provide a clarification here. This is a great opportunity to make sure everone's on the same page." },
  "Accept" :   { "Recap"   : "agrees with the restatement of the issue",
                 "Button"  : "Exactly",
                 "Command" : "It's great that we're on the same page! State it and let's move on to resolution." },
};

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
    this.state = this.stateFromActiion(comment.action);         
    this.comments.push(comment);
  }
  


  mediationSchema.methods.getButtonText = function(action) {
    return action_labels[action].Button;
  }
  
  mediationSchema.methods.getCommandText = function(action) {
    return action_labels[action].Command;
  }
  
  mediationSchema.methods.nextActions = function () {
    switch(this.state) {
      case "Alleged":    return [ "Restate", "Question" ]; 
      case "Questioned": return [ "Clarify" ];
      case "Restated":   return [ "Accept", "Clarify"];
      default: 
          console.log("Unknow status: " + this.status);
          return []
    }  
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
    { $push: { comments: comment } , state: stateFromAction(action)}, 
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