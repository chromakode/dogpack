const moment = require('moment-timezone')
const sample = require('lodash.sample')

const {messages} = require('./env')

exports.randomize = function randomize(template) {
  // Randomize a template consisting of segments to concatenate and randomize
  // at alternating depths. For reference:
  // ["concatenate", ["random", ["concatenate"]], "concatenate"]
  function visit(node, pick) {
    if (typeof node === 'string') {
      return node
    }

    // Recurse, alternating the value of pick
    const results = node.map(x => visit(x, !pick))

    // If pick is true, take a random element, otherwise join the strings
    return pick ? sample(results) : results.join('')
  }

  return visit(template, false)
}

exports.today = function() {
  return moment().tz(messages.tz).format('YYYY-MM-DD')
}
