// MISSU Burn Bot main entry
import { Telegraf } from 'telegraf';
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

bot.launch();
console.log('Telegram bot polling started');
