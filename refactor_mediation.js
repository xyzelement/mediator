var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test'); //EMTODO: standardize db access?

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  

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

  exports.User = mongoose.model('User', userSchema);
});