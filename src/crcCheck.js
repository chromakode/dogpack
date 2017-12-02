const crypto = require('crypto')

const {twitterKeys} = require('./env')

exports.default = function(event, context, callback) {
  const response_token = 'sha256=' + crypto
    .createHmac('sha256', twitterKeys.consumer_secret)
    .update(event.queryStringParameters.crc_token, 'utf8')
    .digest('base64')
  console.log('crc check from twitter:', event.queryStringParameters.crc_token, 'response:', response_token)
  callback(null, {
    statusCode: 200,
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({response_token}),
  })
}
