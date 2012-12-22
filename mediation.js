var db = require("./db");
var util = require("util");

function Mediation(){
  this.arguments = [];
}

var p = Mediation.prototype;

p.set_status = function (status) {
  this.status = status;

  //EMTODO: this actually depends on who is running the system
  switch(this.status) {
    case "Alleged": this.next_actions = [ 
        {action: "Restated",   text: "I think I understand. Let me restate in my own words: "},
        {action: "Questioned", text: "I don't quite understand, can you please clarify: "} ]; 
      break;
    case "Questioned": this.next_actions = [ 
        {action: "Alleged",   text: "Here's my clarification: "} ];
        break;
    case "Restated": this.next_actions = [ 
      {action: "Accepted",   text: "That's right! "},
      {action: "Alleged",    text: "That's not quite it. Let me clarify: "}];

    default: console.log("Unknow status: " + this.status);
  }
}

p.print = function () {
  console.log(util.inspect(this, true, 100, true));
}

p.save = function () {
  var obj = this;
  db.db.mediations.save(obj, 
                        function(err, saved) { 
                          if (err) { console.log("Error saving: " + util.inspect(obj)); }
                        });
}

p.add = function(by, action, text) {
  this.arguments.push({by: by, text: text});
  this.set_status(action);
}



module.exports.Mediation = Mediation;

var mongojs = require('mongojs');
var ObjectId = mongojs.ObjectId;
module.exports.load      = function (id, cb) {

  id = ObjectId(id);
  db.db.mediations.findOne({_id: id}, 
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
	db.db.mediations.find(
    { $or : [ {from: user_id}, { to: user_id} ]},
    {_id: 1, from: 2, to: 3, subject: 4, status: 5},
    function (err, mediations) {
      if (err) { console.log("List error: " + err + " " + util.inspect(mediations)); }
      cb(mediations);
    });
}
