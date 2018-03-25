// Functions are separate files due to a limitation in serverless-chrome:
// https://github.com/adieuadieu/serverless-chrome/blob/7a0a1bdd403083813d81cd5d320f762956a5c98a/packages/serverless-plugin/src/index.js#L12
const moment = require('moment-timezone')
const Twitter = require('twitter')
const CDP = require('chrome-remote-interface')
const generateImage = require('typesetters-son')

const {isScheduledNow, randomize} = require('./utils')
const {messages, twitterKeys} = require('./env')

exports.default = function(event, context, callback, chrome) {
  if (!isScheduledNow('reminder')) {
    return callback()
  }
  console.log('posting reminder')

  const client = new Twitter(twitterKeys)

  const tomorrowText = moment().tz(messages.tz).add(1, 'days').format('dddd, MMMM D, YYYY')

  randomizedSubs = {}
  for (const key of Object.keys(messages.reminder_img.subs)) {
    let value = messages.reminder_img.subs[key]
    if (value === '{tomorrow}') {
      value = tomorrowText
    } else {
      value = randomize(value)
    }
    randomizedSubs[key] = value
  }

  CDP.Version()
    .then(({webSocketDebuggerUrl}) => {
      console.log('connecting to Chrome at', webSocketDebuggerUrl)
      return generateImage(Object.assign(messages.reminder_img, {
        browserWSEndpoint: webSocketDebuggerUrl,
        subs: randomizedSubs,
        output: '/tmp/reminder_image.png',
      }))
    })
    .then(imgData => {
      return client.post('media/upload', {media: imgData})
    })
    .then(media => {
      console.log('uploaded media', media)
      const statusMsg = randomize(messages.reminder_msg).replace('{tomorrow}', tomorrowText)
      client.post('statuses/update', {
        status: statusMsg,
        media_ids: media.media_id_string,
      })
    })
    .then(resp => {
      console.log('tweeted', resp)
      callback()
    })
    .catch(err => {
      console.error('error:', err)
      callback(err)
    })
}
