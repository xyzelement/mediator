
var facebook = require("./facebook");
var util     = require("util");
var cache = {}



exports.getUserObjectAsynch = function(id, done) {
  if (cache[id]) {
    console.log(" ----> HIT " + id);
    done(cache[id]);
  } else {
    console.log(" ----> MISS " + id);
    facebook.getUserProfile(exports.token, id, function(user) {
      cache[id] = {
        userId:     id,
        displayName: user.name,
        pictureUrl:  'https://graph.facebook.com/'+id+'/picture'
      };
      done(cache[id]);
    });
  }
}

exports.create_user_data = function(token, list_of_ids, accum, done) {
  if (list_of_ids.length === 0) {
    done(accum);
  } else {
    exports.token = token;
    var id = list_of_ids.pop();
    
    exports.getUserObjectAsynch(id,
      function (userObject) {
        accum[userObject.userId] = userObject;
        exports.create_user_data(token, list_of_ids, accum, done);
      });
  }
}