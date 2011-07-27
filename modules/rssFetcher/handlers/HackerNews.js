exports.name = "HackerNews"; // (identifier) same of the config file 

exports.url = "http://feedhint.com/handler.php?";

exports.handler = function(feed, callback, lastList, error, dom) {
  
  if (error) {
    throw new Error(error)
  }
  if (dom === undefined) {
    console.log('dom in HNHandler is undefined.')
    return;
  }
  
  var new_items = [];
  var items = dom['items'];
      
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

exports.format = function (data) {
  return "HN: " + data.title + " - " + data.link;
}
