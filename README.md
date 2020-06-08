![a Google-owned dog pack](https://media.giphy.com/media/LIeTjBAxz1npe/giphy-tumblr.gif)

# Dogpack

Dogpack is a Twitter bot which automates announcing and confirming meetups of [DogpatchJS](http://dogpatchjs.com/). It will:

 * Tweet announcing DogpatchJS the morning of the meetup
 * Tweet a reminder the day before the meetup
 * Accept RSVPs in the form of DMs containing emoji
 * Tweet a confirmation or cancellation of the event depending on how many RSVPs are received
 
## Setup

Dogpack is hosted on [AWS Lambda](https://aws.amazon.com/lambda/). To set up your own Dogpack:

1. Install dependencies: `NPM_CONFIG_CHROMIUM_CHANNEL=dev PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 npm i`
1. Create a [new account on AWS](https://aws.amazon.com/)
   1. [Create a new user with "AdministratorAccess" privileges](https://serverless.com/framework/docs/providers/aws/guide/plugins#creating-aws-access-keys).
   1. Save Amazon credentials `npx serverless config credentials --provider aws --key KEY --secret SECRET --profile dogpackProd`.
1. Create a [new Twitter app key](https://apps.twitter.com/app/new), setting callback URL to http://localhost:3000/callback.
1. Copy `messages.json.sample` to `messages.json`, and customize with your meetup details.
    
1. Authenticate with Twitter:
   1. Run `node ./scripts/setupTwitter.js CONSUMER_KEY CONSUMER_SECRET > ../dogpack-keys.prod.json` and open http://localhost:3000 in a web browser.
   1. Click the link and authorize your Twitter app.

1. Deploy: `npx serverless --stage prod deploy`
   1. Note the HTTPs endpoint URL for your webhook in the output. It might be of the form: `https://xxx.execute-api.us-east-1.amazonaws.com/dev/hook-xxx`. Use this in the following step.

1. Set up Twitter's DM Webhook: run `./scripts/setupWebhook.js ../dogpack-keys.prod.json https://your-webhook-https-url`

   You should now have a functioning bot! Test it out by triggering the "postEvent" and "postRSVPs" functions via `npx serverless --stage prod invoke -f your-function-name -l`
