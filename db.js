
var mongo;
app.configure('development', function(){
    mongo = { "db":"mydb" }
});
app.configure('production', function(){
    var env = JSON.parse(process.env.VCAP_SERVICES);
    mongo = env['mongodb-1.8'][0]['credentials'];
});

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
var db = require('mongojs').connect(mongourl, ['topics', 'arguments']);


exports.db = db;


exports.load_topics_for_user = function (user, fail, cb) {
	exports.db.topics.find({ $or : [ {from: user}, { to: user}   ]}, function (err, entries) {
		if (err || !entries) {
			fail("Oops. No data found");
		} else {
      cb(entries);
		}
	});
}

exports.add_argument = function(topic, user_id, says, fail, cb) {
	if (says.length === 0) {
    fail("You probably want to say something here");		
		return;
	}
  exports.db.arguments.save({ topic: topic, user_id: user_id, says: says}, function(err, saved) {
    if (err || !saved) { 
      fail("User not saved"); 
      return;
    }    
    cb();
  });
}

exports.load_arguments_for_topic = function(topic, fail, cb) {
  if(!topic || topic.length==0) {
    fail("You need a topic!");
    return;
  }
  
  exports.db.arguments.find({topic: topic}, 
    function(err, entities) {
        if (err || !entities) fail(err);
        else if (!entities)   fail("No entities loaded");
        else cb(entities);
    }).sort({_id: 1});
}

exports.create_topic = function(from, to, topic, fail, cb) {
	if (to.length === 0)    { fail("Please specify a user"); return; }
	if (topic.length === 0) {	fail("Please say something");  return; }	
      
  var t = {
        topic: topic,
        from:  from,
        to:    to
  }
  
  exports.db.topics.save(t);
  cb();
}

exports.delete_everything = function(cb) {
  exports.db.topics.remove();
  exports.db.arguments.remove();
  cb();
}