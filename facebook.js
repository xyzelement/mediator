var https = require('https');
var conf = require("./config.js");
 
 
exports.get = function(accessToken, apiPath, callback) {
    // creating options object for the https request
    var options = {
        // the facebook open graph domain
        host: 'graph.facebook.com',
 
        // secured port, for https
        port: 443,
 
        // apiPath is the open graph api path
        path: apiPath + '?access_token=' + accessToken,
 
        // well.. you know...
        method: 'GET'
    };
 
    // create a buffer to hold the data received
    // from facebook
    var buffer = '';
 
    // initialize the get request
    var request = https.get(options, function(result){
        result.setEncoding('utf8');
 
        // each data event of the request receiving
        // chunk, this is where i`m collecting the chunks
        // and put them together into one buffer...
        result.on('data', function(chunk){
            buffer += chunk;
        });
 
        // all the data received, calling the callback
        // function with the data as a parameter
        result.on('end', function(){
            callback(buffer);
        });
    });
    
    // just in case of an error, prompting a message
    request.on('error', function(e){
        console.log('error from facebook.get(): '
                     + e.message);
    });
 
    request.end();
}




exports.getUserProfile = function(token, user_id, done) {
  exports.get(token, '/'+user_id, 
    function(data) {
      var obj = JSON.parse(data);
      //console.log(obj);
      done(obj);
    });
}

exports.getFbFriends = function(token, user_id, done) {
  exports.get(token, '/'+user_id+'/friends', 
    function(data){
        var obj = JSON.parse(data);
        function compare(a,b) {
          var a = a.name.toLowerCase();
          var b = b.name.toLowerCase();
          if (a < b) return -1;
          if (a > b) return  1;
          return 0;
    }

        obj.data.sort(compare);
        //done(obj.data);
        var last = "!";
        var out2 = { };
        
        for (var i = 0; i < obj.data.length; ++i) {
          var c = obj.data[i].name.substring(0,1);
          if (c !== last) {
            out2[c] = [];
            last =c ;
          }
          
          out2[c].push(obj.data[i]);
        }
        
        //console.log(out2);
        done(out2);
    });
}

exports.get_fb_invite_url = function (user_to_invite, topic) {
  return 'https://www.facebook.com/dialog/apprequests?app_id='+ conf.FACEBOOK_APP_ID
          +'&title=Notify the other guy'
          +'&redirect_uri=http://localhost:8080/read?topic=' + topic 
          +'&to=' + user_to_invite
          +'&message=I am using Mediator to discuss an issue with you: '+ topic

}
