// Setup

if (process.argv.length !== 3) { // ['node', '*.js', 'config.json']
  console.error('Usage: node punchforkbot <config.json>')
  process.exit(1)
} else {
  var configPath = __dirname + '/' + process.argv[2] // './config.json'
}

var fs = require('fs')

require.extensions[".json"] = function (m) {
  m.exports = JSON.parse(fs.readFileSync(m.filename))
}

var config = require(configPath)

config.irc.channels = [config.irc.channel] // node-irc compatibility

// The Bot

var irc = require('irc'),
    bot = new irc.Client(config.irc.server, config.irc.nick, config.irc)

bot.on('error', function(message) {
  console.log('irc error:')
  console.log(message)
})

bot.chatty = true // rate-limiter semaphore

bot.handle = function(callback) {
  bot.chatty = false
  setTimeout(function() { bot.chatty = true }, config.irc.rate * 1000)
  callback()
}

bot.on('message' + config.irc.channel, function(from, msg) {
  if (bot.chatty) {
    var asked = false
    msg = msg.replace(/^\s+/, '').replace(/\s+/g,' ').replace(/\s+$/,'')
    var nick_re = new RegExp(config.irc.nick+':?\\s*')
    if (msg.match(nick_re)) {
      asked = true
      message = message.replace(nick_re, '')
    }
    if (msg.match(/^recipe/)) {
      asked = true
    }
    if (msg.match(/^recipe$/) || msg.match(/^\s*$/)) {
      bot.handle(function() { bot.random_recipe(from) })
    } else if (asked) {
      msg = msg.replace(/^recipe /, '')
      bot.handle(function() { bot.recipes(from, msg) })
    }
  }
})

bot.random_recipe = function(nick) {
  punchfork.random_recipe(function(response) {
    var recipe = response.recipe
    var message = bot.format(recipe)
    console.log(['recipe for', nick, 'at', recipe.pf_url].join(' ')) 
    bot.say(config.irc.channel, message)
  })
}

bot.recipes = function(nick, query) {
  punchfork.recipes(query, function(response) {
    var count = response.count
    if (count === 0) {
      console.log(['empty search for', nick, ': "' + query + '"'].join(' '))
      bot.say(config.irc.channel, 'no recipes')
    } else {
      var recipes = response.recipes
      var message = bot.format(recipes)
      console.log([nick, count, 'for', '"' + query + '"'].join(' '))
      bot.say(config.irc.channel, message)
    }
  })
}

// recipe output formatting: formats one recipe or an array of recipes
bot.format = function(recipe, suppress) {
  if (typeof recipe.push === 'function') {
    var message = []
    for (var i = 0; i < recipe.length; ++i) {
      message.push(bot.format(recipe[i], i > 0))
    }
    return message.join('  ')
  } else {
    return [
      recipe.title,
      '(' + Math.round(recipe.rating * 10) / 10 + (suppress ? ')' : '/100)'),
      recipe.source_url
    ].join(' ')
  }
}

// Punchfork Recipe API http://punchfork.com/api

var request = require('request')

var punchfork = {}

punchfork.random_recipe = function(callback) {
  punchfork.api({
    'endpoint': 'random_recipe'
  }, callback)
}

punchfork.recipes = function(query, callback) {
  punchfork.api({
    'endpoint': 'recipes',
    'count': config.punchfork.max.toString(),
    'sort': 't',
    'q': query
  }, callback)
}

punchfork.api = function(_options, callback) {
  function sanitize(string) {
    return string.replace(/\W/g, ' ').replace(/ /g,'+')
  }
  var options = _options,
      endpoint = options.endpoint
  delete options.endpoint
  var params = []
  for (name in options) {
    params.push([name, '=', sanitize(options[name])].join(''))
  }
  return punchfork.request(endpoint, params, callback)
}

punchfork.request = function(endpoint, params, callback) {
  var uri = [
    config.punchfork.url,
    endpoint,
    '?',
    'key=', config.punchfork.key
  ].join('')
  if (params.length > 0) {
    uri += '&' + params.join('&')
  }
  request({ 'uri': uri }, function(err, res, buf) {
    if (!err && res.statusCode == 200) {
      callback(JSON.parse(buf))
    } else {
      console.log(res.statusCode)
      console.log(err)
    }
  })
}
