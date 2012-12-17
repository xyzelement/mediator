
var facebook = require("./facebook");
var util     = require("util");
var cache = {}

exports.token = null;

exports.getUserObject = function (id) {

  console.log("getUserObject is deprecated, call the asynch version please");

  return {
      userId:     id,
      displayName: 'New: ' + id,
      pictureUrl:  'https://graph.facebook.com/'+id+'/picture'
    };
}

exports.getUserObjectAsynch = function(id, done) {
  if (cache[id]) {
    done(cache[id]);
  } else {
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

exports.create_user_data = function(list_of_ids, accum, done) {
  if (list_of_ids.length === 0) {
    done(accum);
  } else {
    var id = list_of_ids.pop();
    
    exports.getUserObjectAsynch(id,
      function (userObject) {
        accum[userObject.userId] = userObject;
        exports.create_user_data(list_of_ids, accum, done);
      });
  }
}