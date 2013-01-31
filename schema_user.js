var mongoose = require('mongoose');
var util = require("util");





exports.addSchema = function () {
  

  // USER
  var userSchema = mongoose.Schema({
    facebook_id:  {type: String, unique: true},
    display_name: String,
    email:        String,
  });

  userSchema.methods.getPictureUrl = function () {
    return 'https://graph.facebook.com/'+this.facebook_id+'/picture'
  }
  
  userSchema.methods.needsMoreInfo = function () {
    return this.email == undefined;
  }
  
  userSchema.methods.toString = function () {
    return this.display_name + " (" + this.facebook_id + ") "//+ (this.email ? this.email : "");
  }

  userSchema.methods.sameUser = function(usr) { //EMTODO: is this the right way to compare?
    return this._id === usr._id;
  }
  
  exports.User = mongoose.model('User', userSchema);
}






