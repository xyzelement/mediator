
var cache = {}


exports.getUserObject = function (id) {

  if (!cache[id]) {
    cache[id] = {
    userId:     id,
    displayName: 'New: ' + id,
    pictureUrl:  'https://graph.facebook.com/'+id+'/picture'
    }
  } else {
    cache[id].displayName = 'Cache: ' + id;
  }
  
  return cache[id];
}