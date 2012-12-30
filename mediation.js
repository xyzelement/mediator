var conf = require("./config");
var util = require("util");

function Mediation(){
  this.arguments = [];
}

var p = Mediation.prototype;

p.status_from_action = function(action) {
  console.log("Current status: " + this.status + "   " + action);

  switch (action) {
  case "Start"    : return "Alleged";
  case "Restate"  : return "Restated";
  case "Question" : return "Questioned";
  case "Clarify"  : return "Alleged";
  case "Accept"   : return "Accepted";
  }
}

module.exports.whatever = {
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
}

p.set_status = function (status) {
  this.status = status;

  //EMTODO: this actually depends on who is running the system
  switch(this.status) {
    case "Alleged": this.next_actions = [ 
        {action: "Restate",   text: "I think I understand. Let me restate in my own words: "},
        {action: "Question",  text: "I don't quite understand, can you please clarify: "} ]; 
        break;
    case "Questioned": this.next_actions = [ 
        {action: "Clarify",    text: "Here's my clarification: "} ];
        break;
    case "Restated": this.next_actions = [ 
        {action: "Accept",     text: "That's right! "},
        {action: "Clarify",    text: "That's not quite it. Let me clarify: "}];

    default: console.log("Unknow status: " + this.status);
  }
}

p.print = function () {
  console.log(util.inspect(this, true, 100, true));
}

p.save = function () {
  var obj = this;
  conf.db.mediations.save(obj, 
                        function(err, saved) { 
                          if (err) { console.log("Error saving: " + util.inspect(obj)); }
                        });
}

p.add = function(by, action, text) {
  this.arguments.push({by: by, action: action, text: text});
  var status = this.status_from_action(action);
  this.set_status(status);
}



module.exports.Mediation = Mediation;

var mongojs = require('mongojs');
var ObjectId = mongojs.ObjectId;

module.exports.load      = function (id, cb) {

  id = ObjectId(id);
  conf.db.mediations.findOne({_id: id}, 
    function (err, found) {
      if (err) { console.log("Load error: " + err); }
      
      var x = new Mediation(id);
      x._id       = found._id;
      x.from      = found.from;
      x.to        = found.to;
      x.subject   = found.subject;
      x.set_status(found.status);
      x.arguments = found.arguments;

      cb(x);
    });
}

module.exports.list     = function (user_id, cb) {
	conf.db.mediations.find(
    { $or : [ {from: user_id}, { to: user_id} ]},
    {_id: 1, from: 2, to: 3, subject: 4, status: 5},
    function (err, mediations) {
      if (err) { console.log("List error: " + err + " " + util.inspect(mediations)); }
      cb(mediations);
    });
}
