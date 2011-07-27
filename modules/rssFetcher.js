__basedir = __dirname.replace(/\/modules$/, '');

var lastList = {};
var fdList = {};

var fs          = require('fs'),
    util        = require('util'),
    htmlparser  = require('htmlparser'),
    request     = require('request');

module.exports = RssFetcher;

function RssFetcher(config, bot) {  
  console.log("[!!] RssFetcher object created");
  this.config = config;
  this.bot = bot;
  loadData();
  
  function loadData() {
    var rss_feeds = config.rss_feeds;

    // get last elm fetched for each feed
    rss_feeds.forEach(function(feed) {
      var filename = __basedir + "/.rss-" + feed.name + ".db";
      var fd = fs.openSync(filename, "a+"); // create file if necessary
      fs.closeSync(fd);

      console.log("[!!] Opening data file: " + filename);
      lastList[feed.name] = fs.readFileSync(filename,'utf8').replace('\n','');
    });
  }
}

RssFetcher.prototype.name = 'rssFetcher';

RssFetcher.prototype.start = function() {
  var that = this;
  var rss_feeds = this.config.rss_feeds;
  
  rss_feeds.forEach(function(feed) {
  
    console.log("[!!] Registering function for " + feed.name);
  
    setInterval(function(){
      fetchRSS(feed, sendNewItems.bind({}, feed));
    }, feed.refresh_time*1000);
    
  });
  
  function sendNewItems (feed, new_items){
    var filename = __basedir + "/.rss-" + feed.name + ".db";
    fs.writeFileSync(filename, lastList[feed.name]+'\n', 'utf8');
    
    var new_items = new_items.slice(0,feed.limit).reverse();
    console.log("[!!] There are " + new_items.length + " new items for " + feed.name);

    new_items.forEach(function(item) {
      var channels = feed.channels;
      var format   = handlers[feed.handler].format;
      console.log(format(item));
      
      channels.forEach(function(channel){
        that.bot.say(channel, format(item));
      });
    });
  }
  
  function fetchRSS (feed, cb) {

    console.log('[!!] Fetching feed for ' + feed.name + ' ..');

    var fhandler = handlers[feed.handler].bind({}, feed, cb);    
    var handler  = new htmlparser.RssHandler(fhandler);
    var parser   = new htmlparser.Parser(handler);

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
      if( items[i]['pubDate'] <= lastList[feed.name] ) {
        break;
      }
      new_items.push(items[i]);
    }
  }
  
  lastList[feed.name] = items[0]['pubDate'];    
  callback(new_items);
}

handlers['HNHandler']['format'] = function(data) {
  return "HN: " + data.title + " - " + data.link;
}
