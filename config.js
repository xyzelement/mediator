
exports.FACEBOOK_APP_ID     = process.env.FACEBOOK_APP_ID;
exports.FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
exports.CALLBACK_URL        = process.env.CALLBACK_URL;
exports.MY_URL              = process.env.MY_URL;
exports.LOGGLY_ID           = process.env.LOGGLY_ID;

//exports.db = require('mongojs').connect("mongodb://localhost:27017/mydb", ['mediations', 'users']);

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test'); //EMTODO: standardize db access?
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  require("./schema_user").addSchema();
  require("./schema_mediation").addSchema();
});

exports.connection = db;



var loggly = require('loggly');
var util   = require('util');
var config = { subdomain: "mediator" };
var client = loggly.createClient(config);

exports.log = function(text) {
  client.log(exports.LOGGLY_ID, text,
             function(err, res) { 
               if (true || err) { console.log("Logging: " + err + " " + util.inspect(res)); }
             });
}
