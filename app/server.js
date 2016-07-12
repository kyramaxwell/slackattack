import botkit from 'botkit';
import Yelp from 'yelp';

/* Copied the below lines of text from the github repo */

console.log('starting bot');

// botkit controller
const controller = botkit.slackbot({
  debug: false,
});

// initialize slackbot
const slackbot = controller.spawn({
  token: process.env.SLACK_BOT_TOKEN,
  // this grabs the slack token we exported earlier
}).startRTM(err => {
  // start the real time message client
  if (err) { throw new Error(err); }
});

// prepare webhook
// for now we won't use this but feel free to look up slack webhooks
controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
  controller.createWebhookEndpoints(webserver, slackbot, () => {
    if (err) { throw new Error(err); }
  });
});

// yelp
const yelp = new Yelp({
  consumer_key: process.env.YELP_CONSUMER_KEY,
  consumer_secret: process.env.YELP_CONSUMER_SECRET,
  token: process.env.YELP_TOKEN,
  token_secret: process.env.YELP_SECRET_TOKEN,
});


// example hello response (with attachment)
controller.hears(['hello', 'hi', 'howdy'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      // bot.reply(message, `Hello, ${res.user.name}!`);
      bot.reply(message, {
        attachments: [
          {
            pretext: `Hello ${res.user.name}!`,
            image_url: 'http://i.giphy.com/dzaUX7CAG0Ihi.gif',
          },
        ],
      });
    } else {
      // bot.reply(message, 'Hello there!');
      bot.reply(message, {
        attachments: [
          {
            pretext: 'Hello there!',
            image_url: 'http://i.giphy.com/dzaUX7CAG0Ihi.gif',
          },
        ],
      });
    }
  });
});

// Conversation structure taken from https://github.com/howdyai/botkit/blob/master/examples/convo_bot.js
// Restaurant query conversation
controller.hears(['hungry', 'food', 'I\'m hungry'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.startConversation(message, askRecommendations);
});

function askRecommendations(response, convo) {
  convo.ask('Would you like food recommendations near you?', () => {
    convo.say('Great.');
    askFoodType(response, convo);
    convo.next();
  });
}

function askFoodType(response, convo) {
  convo.ask('What type of food are you interested in?', () => {
    convo.say('Ok.');
    askLocation(response, convo);
    convo.next();
  });
}
function askLocation(response, convo) {
  convo.ask('Where are you?', () => {
    convo.say('Ok one sec pulling up results');
    const what = convo.extractResponse('What type of food are you interested in?');
    const where = convo.extractResponse('Where are you?');
    yelp.search({ term: what, location: where })
    .then((data) => {
      data.businesses.forEach(business => {
        const replyWithAttachments = {
          attachments: [
            {
              pretext: `rating: ${business.rating}`,
              title: business.name,
              title_link: business.url,
              text: business.snippet_text,
              image_url: business.image_url,
            },
          ],
        };
        convo.say(replyWithAttachments);
      });
    })
    .catch((err) => {
      console.error(err);
      convo.say('Sorry I couldn\'t find any restaurants');
    });
    convo.next();
  });
}

// Fun conversation
controller.hears(['talk to me'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.startConversation(message, askColor);
});

function askColor(response, convo) {
  convo.ask('What is your favorite color?', () => {
    convo.say('Good choice');
    askFood(response, convo);
    convo.next();
  });
}

function askFood(response, convo) {
  convo.ask('What is your favorite food?', () => {
    convo.say('Sounds tasty!');
    askSpiritAnimal(response, convo);
    convo.next();
  });
}
function askSpiritAnimal(response, convo) {
  convo.ask('What is your spirit animal?', () => {
    convo.say('I love that animal!\nNice getting to know you. Bye!');
    convo.next();
  });
}

// "help" response
controller.hears(['help'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'Hi! I\'m kyra_bot\nTo have a conversation say "talk to me"\nTo get restaurant reccomendations say "I\'m hungry"\nOr just say hello!');
});

// outgoing_webhook
controller.on(['kyra_bot'], ['outgoing_webhook'], (bot, message) => {
  bot.replyPublic(message, 'yeah yeah I\'m up');
});

// response to unknown messages
controller.hears([''], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `Sorry, ${res.user.name}, I don't understand that!`);
    } else {
      bot.reply(message, 'Sorry, I don\'t understand that!');
    }
  });
});
