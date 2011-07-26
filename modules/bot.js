// Setup

if (process.argv.length !== 3) { // ['node', '*.js', 'config.json']
  console.error('Usage: node bot.js <config.json>')
  process.exit(1)
} else {
  var __basePath = __dirname.replace(/\/modules$/, '')
  var configPath = __basePath + '/' + process.argv[2] // './config.json'
}

var fs = require('fs')

require.extensions[".json"] = function (m) {
  m.exports = JSON.parse(fs.readFileSync(m.filename))
}

var config = exports.config = require(configPath)

config.irc.autoConnect = false

// The Bot

var irc = require('irc')

var bot = exports.bot = new irc.Client(config.irc.server, config.irc.nick, config.irc)

// rate-limiter - semaphores
// bot.chatty = { '#channel': { 'module': true, … }, … }
bot.chatty = {}
bot.chatty.on = function(channel, module_name) {
  if (channel in bot.chatty) {
    bot.chatty[channel][module_name] = true
  } else {
    bot.chatty[channel] = {}
    bot.chatty.on(channel, module_name)
  }
}
bot.chatty.off = function(channel, module_name) {
  bot.chatty[channel][module_name] = false
  setTimeout(function() {
    bot.chatty.on(channel, module_name)
  }, config.irc.rate * 1000)
}
bot.isChatty = function(channel, module_name) {
  return bot.chatty[channel][module_name] || false
}

// rate-limiter - gives the module's callback
//  config.irc.rate seconds to work alone
//  before accepting any other requests
bot.handle = function(nick, channel, message, callback) {
  if (bot.isChatty(channel, callback.module_name)) {
    message = message.trim().replace(/\s+/g,' ')
    var nick_re = new RegExp('^\\s*'+bot.nick+':?\\s*')
    if (message.match(nick_re)) {
      message = message.replace(nick_re, '')
      bot.chatty.off(channel, callback.module_name)
      callback(bot, nick, channel, message)
    }
  }
}

// bot.onMessage(callback) for adding an handler for all the channels
// bot.onMessage('#somechannel', callback) for a specific irc channel
bot.onMessage = function(channel, callback) {
  if (typeof channel === 'function') {
    config.irc.channels.forEach(function(channel) {
      bot.onMessage(channel, callback)
    })
  } else {
    bot.on('message' + channel, function(from, message) {
      bot.handle(from, channel, message, callback)
    })
  }
}

// hook up a module.handler function (to the relevant message#channel events)
//  and module.{start,stop} if needed (reps. efficiently now and on('quit', …)
bot.hook = function(module) {
  var channels = []
  if ('channels' in config[module.name]) {
    channels = config[module.name].channels
  } else {
    channels = config.irc.channels
  }
  channels.forEach(function(channel) {
    var callback = module.handler.bind(module)
    callback.module_name = module.name
    bot.chatty.on(channel, module.name)
    bot.onMessage(channel, callback)
  })
  if (module.stop) {
    bot.on('quit', module.stop.bind(module))
  }
  if (module.start) {
    process.nextTick(module.start.bind(module))
  }
}