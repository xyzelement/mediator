var db = require("./db");
var util = require("util");

function Mediation(){
  this.arguments = [];
}

var p = Mediation.prototype;

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

p.add = function(by, text) {
  this.arguments.push({by: by, text: text});
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
      x.arguments = found.arguments;

      cb(x);
    });
}

module.exports.list     = function (user_id, cb) {
	db.db.mediations.find({ $or : [ {from: user_id}, { to: user_id} ]}, {_id: 1, from: 2, to: 3, subject: 4},  
    function (err, mediations) {
      if (err) { console.log("List error: " + err); }

      console.log(util.inspect(mediations, true, 100, true));

      cb(mediations);
    });
}

function temp(m) {
  m.add("Sup", "asss");
  m.save();
}

//exports.list("Ed");
//load(2, temp);

