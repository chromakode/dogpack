const AWS = require('aws-sdk')
const Twitter = require('twitter')

const {randomize, today} = require('./utils')
const {messages, twitterKeys} = require('./env')

const dynamoDB = new AWS.DynamoDB.DocumentClient()

exports.default = function(event, context, callback) {
  const client = new Twitter(twitterKeys)

  const day = today()
  const dayFetchParams = {
    TableName: process.env.DYNAMODB_TABLE_DAYS,
    Key: {
      Date: day,
    },
  }
  const dayFetch = dynamoDB.get(dayFetchParams).promise()

  const queryFetchParams = {
    TableName: process.env.DYNAMODB_TABLE_RSVPS,
    KeyConditionExpression: '#date = :date',
    ExpressionAttributeNames: {
      '#date': 'Date',
    },
    ExpressionAttributeValues: {
      ':date': day,
    },
  }
  const queryFetch = dynamoDB.query(queryFetchParams).promise()

  Promise.all([
    dayFetch,
    queryFetch,
  ])
    .then(([dayItem, rsvpItems]) => {
      const emojis = rsvpItems.Items.map(rsvp => rsvp.Emoji)
      console.log('RSVP emojis for', day, ':', emojis)

      if (emojis.length < messages.min_rsvp) {
        return client.post('statuses/update', {
          status: randomize(messages.cancel_msg),
          in_reply_to_status_id: dayItem.Item.EventStatusID,
        })
      }

      const confirmMsg = randomize(messages.confirm_msg)
      const confirmMsgLength = [...confirmMsg].length
      const emojiSpaces = 140 - confirmMsgLength - '[+999]'.length
      const displayedEmoji = emojis.slice(0, emojiSpaces).join('')
      const notDisplayedEmojiCount = Math.min(999, emojis.length - emojiSpaces)
      const notDisplayedEmojiMsg = notDisplayedEmojiCount > 0 ? `[+${notDisplayedEmojiCount}]` : ''

      return client.post('statuses/update', {
        status: confirmMsg + displayedEmoji + notDisplayedEmojiMsg,
        in_reply_to_status_id: dayItem.Item.EventStatusID,
      }).then(resp => {
        console.log('tweeted', resp)
      })
    })
    .then(() => callback())
    .catch(err => {
      console.error('error:', err)
      callback(err)
    })
}
