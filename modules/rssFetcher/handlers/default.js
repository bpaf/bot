var ent = require('ent');

exports.handler = function(feed, callback, lastList, error, dom) {
  
  if (error || dom === undefined) {
    console.log(error);
    if(!dom) console.log('dom is undefined.')
    return;
  }
  
  var new_items = [];
  var items = dom['items'];
  
  lastList[feed.name] = new Date(lastList[feed.name]);
  
  console.log('[!!] Last fetch of '+feed.name+': '+lastList[feed.name]);
  
  if(!lastList[feed.name]) {
    console.log('[!!] ' + feed.name + ' first fetch.');
    new_items = items;
  }
  else {
    for (var i in items){
      if( items[i]['pubDate'] <= lastList[feed.name] ) {
        break;
      }
      new_items.push(items[i]);
    }
  }
  
  lastList[feed.name] = items[0]['pubDate'];    
  callback(new_items);
}

exports.format = function (feed, data) {
  var title = ent.decode(data.title);
  return "["+feed.name+"] " + title + " - " + data.link;
}