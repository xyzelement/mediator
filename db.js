var util = require("util");
var mongo;


app.configure('development', function(){
    mongo = { "db":"mydb" }
});
app.configure('production', function(){
    var env = JSON.parse(process.env.VCAP_SERVICES);
    mongo = env['mongodb-1.8'][0]['credentials'];
});


var mongojs = require('mongojs');
var ObjectId = mongojs.ObjectId;

var generate_mongo_url = function(obj){
    obj.hostname = (obj.hostname || 'localhost');
    obj.port = (obj.port || 27017);
    obj.db = (obj.db || 'test');
    if(obj.username && obj.password){
        return "mongodb://" + obj.username + ":" + obj.password + "@" + obj.hostname + ":" + obj.port + "/" + obj.db;
    }else{
        return "mongodb://" + obj.hostname + ":" + obj.port + "/" + obj.db;
    }
}

var mongourl = generate_mongo_url(mongo);
var db = require('mongojs').connect(mongourl, ['mediations']);


exports.db = db;

exports.get_debug = function ( cb ) {
  exports.db.mediations.find( {}, function (err, out) { 
      console.log(out);
      cb({ mediations: out});
  } );
}

exports.delete_everything = function(cb) {
  exports.db.mediations.remove();
  cb();
}