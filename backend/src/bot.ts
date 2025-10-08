// MISSU Burn Bot main entry
import { Telegraf } from 'telegraf';
import express from 'express';
import { config } from './env';
import { handleFee } from './fee';
import { getBurns, getTopTokens, getTokenStats, subscribe, unsubscribe, getFeed, getBurnLink } from './missu';
import { postBurnToChannel } from './helius';

const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply('Welcome to MISSU Burn Bot! Every command burns a little $MISSU. Viral, self-sustaining, and transparent.');
});

bot.command('top', async (ctx) => {
  await handleFee();
  const top = await getTopTokens();
  ctx.reply(top);
});

bot.command('burns', async (ctx) => {
  await handleFee();
  const burns = await getBurns();
  ctx.reply(burns);
});

bot.command('token', async (ctx) => {
  await handleFee();
  const mint = ctx.message.text.split(' ')[1];
  const stats = await getTokenStats(mint);
  ctx.reply(stats);
});

bot.command('watch', async (ctx) => {
  await handleFee();
  const mint = ctx.message.text.split(' ')[1];
  await subscribe(String(ctx.chat.id), mint);
  ctx.reply(`Subscribed to ${mint} burns.`);
});

bot.command('unwatch', async (ctx) => {
  await handleFee();
  const mint = ctx.message.text.split(' ')[1];
  await unsubscribe(String(ctx.chat.id), mint);
  ctx.reply(`Unsubscribed from ${mint} burns.`);
});

bot.command('burnlink', async (ctx) => {
  await handleFee();
  const [mint, amount] = ctx.message.text.split(' ').slice(1);
  const link = await getBurnLink(mint, amount);
  ctx.reply(link);
});

bot.command('feed', async (ctx) => {
  await handleFee();
  const feed = await getFeed();
  ctx.reply(feed);
});

// Bonus: auto-post mode for Telegram channel
const CHANNEL_ID = config.TELEGRAM_CHANNEL_ID;
export async function postToChannel(message: string) {
  if (CHANNEL_ID) {
    await bot.telegram.sendMessage(CHANNEL_ID, message);
  }
}

async function start() {
  if (config.TELEGRAM_WEBHOOK_URL) {
    // Webhook mode: set webhook and start express server to receive updates
  const app = express();
  app.use(express.json());

  // Use a parameterized path so we can include the raw token in the webhook URL
  const webhookPath = '/webhook/:token';

  // set Telegram webhook to the provided URL + path (include encoded token)
  const webhookUrl = config.TELEGRAM_WEBHOOK_URL.replace(/\/$/, '') + '/webhook/' + encodeURIComponent(config.TELEGRAM_BOT_TOKEN);
    try {
      await bot.telegram.setWebhook(webhookUrl);
      console.log('Telegram webhook set to', webhookUrl);
    } catch (err) {
      console.error('Failed to set Telegram webhook', err);
      throw err;
    }

    app.post(webhookPath, async (req, res) => {
      try {
        // basic token check - ensure incoming path token matches the configured bot token
        const incoming = req.params.token;
        if (incoming !== config.TELEGRAM_BOT_TOKEN && decodeURIComponent(incoming) !== config.TELEGRAM_BOT_TOKEN) {
          console.warn('Received webhook with invalid token');
          return res.sendStatus(401);
        }
        await bot.handleUpdate(req.body as any);
        res.sendStatus(200);
      } catch (err) {
        console.error('Error handling update', err);
        res.sendStatus(500);
      }
    });

    const port = Number(config.PORT || 5000);
    app.listen(port, () => {
      console.log(`Express webhook server listening on port ${port}`);
    });
  } else {
    // Polling mode (default)
    await bot.launch();
    console.log('Telegram bot polling started');
  }
}

start().catch((err) => {
  console.error('Failed to start bot', err);
  process.exit(1);
});
