#!/usr/bin/env node
const fs = require('fs')
const process = require('process')
const Twitter = require('twitter')

if (process.argv.length !== 4) {
  console.log('Usage: node setupWebhook.js path-to-keys.json https://your-webhook-url')
  process.exit(1)
}
const twitterKeys = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'))
const webhookURL = process.argv[3]
const client = new Twitter(twitterKeys)

console.log('Registering webhook:', webhookURL)
client.get('account_activity/webhooks', {})
  .then(hooks => {
    console.log('existing webhooks:', hooks)
    const hook = hooks.find(hook => hook.url === webhookURL)
    console.log('removing existing webhooks')
    return Promise.all(
      hooks.map(({id}) => client.__request('delete', `account_activity/webhooks/${id}`, {}))
    )
      .then(() => {
        console.log('adding hook', webhookURL)
        return client.post('account_activity/webhooks', {url: webhookURL})
      })
  })
  .then(hook => {
    console.log('subscribing user')
    return client.post(`account_activity/webhooks/${hook.id}/subscriptions`, {})
  })
  .then(() => {
    console.log('done')
  })
  .catch(err => {
    console.error('error:', err)
  })
