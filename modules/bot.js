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

// rate-limiter semaphore
bot.chatty = true

// rate-limiter - gives the callback config.irc.rate seconds
// to work alone before accepting any other requests
bot.handle = function(nick, channel, message, callback) {
  bot.chatty = false
  setTimeout(function() { bot.chatty = true }, config.irc.rate * 1000)
  callback(bot, nick, channel, message)
}

// bot.onMessage(callback) for adding an handler for all the channels
// bot.onMessage('#somechannel', callback) for a specific irc channel
bot.onMessage = function(channel, callback) {
  if (typeof channel === 'function') {
    config.irc.channels.forEach(function(channel) {
      bot.onMessage(channel, callback)
    })
  } else {
    //console.log(['registering',callback.name,'on',channel].join(' '))
    bot.on('message' + channel, function(from, msg) {
      if (bot.chatty) {
        msg = msg.replace(/^\s+/, '').replace(/\s+/g,' ').replace(/\s+$/,'')
        var nick_re = new RegExp('^\\s*'+config.irc.nick+':?\\s*')
        if (msg.match(nick_re)) {
          msg = msg.replace(nick_re, '')
          bot.handle(from, channel, msg, callback)
        }
      }
    })
  }
}

bot.hook = function(module) {
  var channels = []
  if ('channels' in config[module.name]) {
    channels = config[module.name].channels
  } else {
    channels = config.irc.channels
  }
  channels.forEach(function(channel) {
    module.handler.name = module.name + '.handler'
    bot.onMessage(channel, module.handler.bind(module))
  })
}