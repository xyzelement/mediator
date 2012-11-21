
users = [
   { id: 1, username: 'bob', password: 'bob', email: 'bob@example.com' }
 , { id: 2, username: 'joe', password: 'joe', email: 'joe@example.com' }
 , { id: 3, username: 'ed', password: 'ed', email: 'ed@example.com' }
 , { id: 4, username: 'yelena', password: 'yelena', email: 'yelena@example.com' }
 ];

exports.users = users;

exports.findById = function(id, fn) {
  var idx = id - 1;
  if (users[idx]) {
    fn(null, users[idx]);
  } else {
    fn(new Error('User ' + id + ' does not exist'));
  }
}

exports.findByUsername = function(username, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
    if (user.username === username) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}  