const AWS = require('aws-sdk')
const Twitter = require('twitter')

const {randomize, today} = require('./utils')
const {messages, twitterKeys} = require('./env')

const dynamoDB = new AWS.DynamoDB.DocumentClient()

module.exports.default = function(event, context, callback) {
  const client = new Twitter(twitterKeys)
  client.post('statuses/update', {
    status: randomize(messages.event_msg) + `\nhttps://twitter.com/messages/compose?recipient_id=${process.env.TWITTER_ID}`,
  })
    .then(resp => {
      console.log('tweeted', resp)
      const updateParams = {
        TableName: process.env.DYNAMODB_TABLE_DAYS,
        Key: {
          Date: today(),
        },
        UpdateExpression: 'set EventStatusID = :eventStatusID',
        ExpressionAttributeValues: {
          ':eventStatusID': resp.id_str,
        },
      }
      return dynamoDB.update(updateParams).promise()
    })
    .then(() => callback())
    .catch(err => {
      console.error('error:', err)
      callback(err)
    })
}
