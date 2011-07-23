// Punchfork Recipe API http://punchfork.com/api

var request = require('request')

module.exports = Punchfork

function Punchfork(config) {
  this.config = config
}

Punchfork.prototype.name = 'punchfork'

Punchfork.prototype.request = function(endpoint, params, callback) {
  var uri = [
    this.config.url,
    endpoint,
    '?',
    'key=', this.config.key
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

Punchfork.prototype.api = function(_options, callback) {
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
  return this.request(endpoint, params, callback)
}

Punchfork.prototype.random_recipe = function(callback) {
  this.api({
    'endpoint': 'random_recipe'
  }, callback)
}

Punchfork.prototype.recipes = function(query, callback) {
  this.api({
    'endpoint': 'recipes',
    'count': this.config.max.toString(),
    'sort': 't',
    'q': query
  }, callback)
}

// IRC functions

// punchfork.format(recipe) = "title (##) URI"
// punchfork.format([..]) = "title (##) URI  ..." config.punchfork.max times
Punchfork.prototype.format = function(recipe, suppress) {
  if (typeof recipe.push === 'function') {
    var message = []
    for (var i = 0; i < recipe.length; ++i) {
      message.push(this.format(recipe[i], i > 0))
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

Punchfork.prototype.random = function(bot, nick, channel) {
  that = this
  this.random_recipe(function(response) {
    var recipe = response.recipe
    var message = that.format(recipe)
    console.log(['recipe for', nick, 'at', recipe.pf_url].join(' ')) 
    bot.say(channel, message)
  })
}

Punchfork.prototype.search = function(bot, nick, channel, query) {
  that = this
  this.recipes(query, function(response) {
    var count = response.count
    if (count === 0) {
      console.log(['empty search for', nick, ': "' + query + '"'].join(' '))
      bot.say(channel, 'no recipes')
    } else {
      var recipes = response.recipes
      var message = that.format(recipes)
      console.log([nick, count, 'for', '"' + query + '"'].join(' '))
      bot.say(channel, message)
    }
  })
}

Punchfork.prototype.handler = function(bot, nick, channel, msg) {
  console.log(['punchfork.handler',nick,channel,'"'+msg+'"'].join(' '))
  if (msg.match(/^\s*(?:recipe|repice)?\s*$/)) {
    this.random(bot, nick, channel)
  } else if (msg.match(/^\s*(?:recipe|repice)?.*/)) {
    this.search(bot, nick, channel, msg)
  }
}