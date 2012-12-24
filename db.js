
exports.db = require('mongojs').connect("mongodb://localhost:27017/mydb", ['mediations']);

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