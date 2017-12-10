const AWS = require('aws-sdk')
const crypto = require('crypto')
const moment = require('moment-timezone')
const Twitter = require('twitter')
const emojiRegex = require('emoji-regex')()

const {randomize, today} = require('./utils')
const {messages, twitterKeys} = require('./env')

const dynamoDB = new AWS.DynamoDB.DocumentClient()

exports.default = function(event, context, callback) {
  console.log('incoming webhook', event.body)

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', process.env.TWITTER_CONSUMER_SECRET)
    .update(event.body, 'utf8')
    .digest('base64')
  if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(event.headers['X-Twitter-Webhooks-Signature']))) {
    console.warn('invalid webhook signature:', event.headers['X-Twitter-Webhooks-Signature'], 'expected:', expectedSignature)
    callback(null, {
      statusCode: 400,
      headers: {'Content-Type': 'text/plain'},
      body: 'invalid webhook signature',
    })
  }

  let parsedBody
  try {
    parsedBody = JSON.parse(event.body)
  } catch (err) {
    throw new Error(`Unable to parse request body: ${err}`)
  }


  const client = new Twitter(twitterKeys)

  const promises = parsedBody.direct_message_events.map(dmEvent => {
    if (dmEvent.type !== 'message_create' || dmEvent.message_create.sender_id === process.env.TWITTER_ID) {
      return
    }

    const ts = moment(Number(dmEvent.created_timestamp)).tz(messages.tz)
    const messageText = dmEvent.message_create.message_data.text
    const senderID = dmEvent.message_create.sender_id
    const senderUserID = `twitter:${senderID}`

    console.log('received:', messageText)

    if (messageText === 'nvm') {
      console.log('nvm received. sending ok nvm response')
      const deleteParams = {
        TableName: process.env.DYNAMODB_TABLE_RSVPS,
        Key: {
          Date: ts.format('YYYY-MM-DD'),
          UserID: senderUserID,
        },
      }
      return dynamoDB.delete(deleteParams).promise()
        .then(() => client.post('direct_messages/new', {
          user_id: senderID,
          text: randomize(messages.ok_nvm_dm_msg),
        }))
    }

    if (messageText === 'who') {
      console.log('who received. sending who response')
      const queryFetchParams = {
        TableName: process.env.DYNAMODB_TABLE_RSVPS,
        KeyConditionExpression: '#date = :date',
        ExpressionAttributeNames: {
          '#date': 'Date',
        },
        ExpressionAttributeValues: {
          ':date': today(),
        },
      }
      return dynamoDB.query(queryFetchParams).promise()
        .then(rsvpItems => {
          let msgText
          if (rsvpItems.Items.length) {
            const namesText = rsvpItems.Items.map(rsvp => `@${rsvp.Name}`).join(', ')
            msgText = randomize(messages.who_dm_msg).replace('{who}', namesText)
          } else {
            msgText = randomize(messages.who_none_dm_msg)
          }
          return client.post('direct_messages/new', {
            user_id: senderID,
            text: msgText,
          })
        })
    }

    const emojiMatch = messageText.match(emojiRegex)
    const emoji = emojiMatch ? emojiMatch[0] : null

    if (!emoji) {
      console.log('no emoji found. sending huh response')
      return client.post('direct_messages/new', {
        user_id: senderID,
        text: randomize(messages.huh_dm_msg),
      })
    }

    console.log('emoji found. sending ok response')
    const updateParams = {
      TableName: process.env.DYNAMODB_TABLE_RSVPS,
      Key: {
        Date: ts.format('YYYY-MM-DD'),
        UserID: senderUserID,
      },
      UpdateExpression: 'set #emoji = :emoji, #name = :name, #timestamp = :timestamp',
      ExpressionAttributeNames: {
        '#emoji': 'Emoji',
        '#name': 'Name',
        '#timestamp': 'Timestamp',
      },
      ExpressionAttributeValues: {
        ':emoji': emoji,
        ':name': parsedBody.users[senderID].screen_name,
        ':timestamp': ts.toDate(),
      },
    }
    return dynamoDB.update(updateParams).promise()
      .then(() => client.post('direct_messages/new', {
        user_id: senderID,
        text: randomize(messages.ok_dm_msg),
      }))
  })

  Promise.all(promises)
    .then(() => {
      callback(null, {
        statusCode: 200,
        headers: {'Content-Type': 'text/plain'},
        body: 'ok',
      })
    })
    .catch(err => {
      console.error('error:', err)
      callback(null, {
        statusCode: 500,
        headers: {'Content-Type': 'text/plain'},
        body: 'internal error',
      })
    })
}
