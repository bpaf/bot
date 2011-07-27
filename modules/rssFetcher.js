__basedir = __dirname.replace(/\/modules$/, '');

var lastList = {};
var fdList = {};

var fs          = require('fs'),
    util        = require('util'),
    htmlparser  = require('htmlparser'),
    request     = require('request');

module.exports = RssFetcher

function RssFetcher(config, bot) {  
  console.log("[!!] RssFetcher object created");
  this.config = config;
  this.bot = bot;
  this.loadData();
}

RssFetcher.prototype.name = 'rssFetcher'

RssFetcher.prototype.loadData = function() {
  var rss_feeds = this.config.rss_feeds;
  
  // get last elm fetched for each feed
  for (var i in rss_feeds) {
    var feed = rss_feeds[i];

    var filename = __basedir + "/.rss-" + feed.name + ".db";
    
    var fd = fs.openSync(filename, "a+"); // create file if necessary
    fs.closeSync(fd);
    
    console.log("[!!] Opening data file: " + filename);
    
    lastList[feed.name] = fs.readFileSync(filename,'utf8').replace('\n','');
  }
}

RssFetcher.prototype.start = function(channel) {
  var that = this;
  var rss_feeds = this.config.rss_feeds;
  
  for (var i in rss_feeds){

    var f = rss_feeds[i];
  
    console.log("[!!] Registering function for " + f.name);
  
    setInterval((function(feed) {
      return function(){
      fetchRSS(feed, function(new_items){
        
        var filename = __basedir + "/.rss-" + feed.name + ".db";
        fs.writeFileSync(filename, lastList[feed.name]+'\n', 'utf8');
        
        new_items = new_items.slice(0,feed.limit).reverse();
        console.log("[!!] There are " + new_items.length + " new items for " + feed.name);
    
        for (var j in new_items){
          var item = new_items[j];
          var fhformat = handlers[feed.handler].format;
          console.log(fhformat(item));
          that.bot.say( channel, fhformat(item) );
        }
    
      });
    }})(f), f.refresh_time*1000);

  }
  
  function fetchRSS (feed, cb) {

    console.log('[!!] Fetching feed for ' + feed.name + ' ..');

    var fhandler = handlers[feed.handler];

    var handler = function(error, dom){ fhandler(feed, cb, error, dom); }
    handler    = new htmlparser.RssHandler(handler);
    var parser = new htmlparser.Parser(handler);

    request({ url: feed.url, encoding: 'utf8' }, function(error, response, body) {

      if (!error && response.statusCode == 200) {
        console.log('[!!] Feed for ' + feed.name + ' fetched succesfully');

        body = body.replace(/<hide>|<\/hide>/g,'');
        body = parser.parseComplete(body);
      }
    });

  }
  
}

// Handlers

var handlers = {}

handlers['HNHandler'] = function (feed, callback, error, dom) {
  
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
      
      if( items[i]['pubDate'] > lastList[feed.name] ) {
        new_items.push(items[i]);
      }
      else {
        break;
      }
    }
  }
  
  lastList[feed.name] = items[0]['pubDate'];    
  callback(new_items);

}

handlers['HNHandler']['format'] = function(data) {
  return "HN: " + data.title + " - " + data.link;
}