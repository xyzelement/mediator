
exports.FACEBOOK_APP_ID     = process.env.FACEBOOK_APP_ID;
exports.FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
exports.CALLBACK_URL        = process.env.CALLBACK_URL;
exports.MY_URL              = process.env.MY_URL;
exports.LOGGLY_ID           = process.env.LOGGLY_ID;

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
