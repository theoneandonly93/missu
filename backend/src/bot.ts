// MISSU Burn Bot main entry
import { Telegraf } from 'telegraf';
import express from 'express';
import { config } from './env';
import { handleFee } from './fee';
import { getBurns, getTopTokens, getTokenStats, subscribe, unsubscribe, getFeed, getBurnLink } from './missu';
import { postBurnToChannel } from './helius';

// Solana imports (dynamically imported to avoid startup cost if unused elsewhere)
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply(
    'Welcome to MISSU Burn Bot!\n\n' +
      'This bot helps you discover and participate in token burns on Solana.\n' +
      'Fee system: a small developer fee is taken on certain actions and (by default) converted from SOL into $MISSU and burned or distributed according to the project rules. Live swaps are gated by server configuration for safety.\n\n' +
      'Available commands:\n' +
      '/top - top tokens by % percentage\n' +
      '/burns - recent burns\n' +
      '/token <mint> - stats for one token\n' +
      '/watch <mint> - subscribe to alerts\n' +
      '/unwatch or /unwatchable <mint> - unsubscribe\n' +
      '/burnlink <mint> <amount> - returns instructions to burn tokens\n' +
      '/feed - shows how much SOL has been converted & burned in $MISSU\n'
  );
});

bot.command('top', async (ctx) => {
  await handleFee();
  const top = await getTopTokens();
  if (!top) return ctx.reply('No top tokens available right now.');
  ctx.reply(String(top));
});

bot.command('burns', async (ctx) => {
  await handleFee();
  const burns = await getBurns();
  if (!burns) return ctx.reply('No recent burns found.');
  ctx.reply(String(burns));
});

bot.command('token', async (ctx) => {
  await handleFee();
  const parts = ctx.message.text.trim().split(/\s+/);
  const mint = parts[1];
  if (!mint) return ctx.reply('Usage: /token <mint>');
  const stats = await getTokenStats(mint);
  if (!stats) return ctx.reply(`No stats available for ${mint}`);
  ctx.reply(String(stats));
});

bot.command('watch', async (ctx) => {
  await handleFee();
  const parts = ctx.message.text.trim().split(/\s+/);
  const mint = parts[1];
  if (!mint) return ctx.reply('Usage: /watch <mint>');
  await subscribe(String(ctx.chat.id), mint);
  ctx.reply(`Subscribed to ${mint} burns.`);
});

bot.command('unwatch', async (ctx) => {
  await handleFee();
  const parts = ctx.message.text.trim().split(/\s+/);
  const mint = parts[1];
  if (!mint) return ctx.reply('Usage: /unwatch <mint>');
  await unsubscribe(String(ctx.chat.id), mint);
  ctx.reply(`Unsubscribed from ${mint} burns.`);
});

// alias requested: /unwatchable
bot.command('unwatchable', async (ctx) => {
  await handleFee();
  const parts = ctx.message.text.trim().split(/\s+/);
  const mint = parts[1];
  if (!mint) return ctx.reply('Usage: /unwatchable <mint>');
  await unsubscribe(String(ctx.chat.id), mint);
  ctx.reply(`Unsubscribed from ${mint} burns.`);
});

bot.command('burnlink', async (ctx) => {
  await handleFee();
  const parts = ctx.message.text.trim().split(/\s+/).slice(1);
  const mint = parts[0];
  const amount = parts[1];
  const wallet = parts[2];
  if (!mint || !amount) return ctx.reply('Usage: /burnlink <mint> <amount> [your_wallet_address]\nReturns instructions to burn tokens.');
  const link = await getBurnLink(mint, amount, wallet);
  if (!link) return ctx.reply('Failed to generate burn instructions.');
  ctx.reply(String(link));
});

// /burn <mint> <amount> - performs on-chain transfer to burn and dev wallets (simulated Jupiter swap)
bot.command('burn', async (ctx) => {
  try {
    const parts = ctx.message.text.trim().split(/\s+/);
    const mint = parts[1];
    const amountRaw = parts[2];
    if (!mint || !amountRaw) return ctx.reply('Usage: /burn <mint> <amount>');

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) return ctx.reply('Invalid amount');

    // Calculate dev fee and burn amount
    const devPercent = Number(process.env.DEV_FEE_PERCENT || '1');
    const feeAmount = (amount * devPercent) / 100;
    const burnAmount = amount - feeAmount;

    // Load payer keypair
    if (!process.env.BOT_SOL_PAYER_SECRET) return ctx.reply('Server not configured to send transactions.');
    const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.BOT_SOL_PAYER_SECRET)));
    const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');

    const mintPubkey = new PublicKey(mint);
    const burnWallet = new PublicKey(process.env.BURN_WALLET || '11111111111111111111111111111111');
    const devWallet = new PublicKey(process.env.DEV_FEE_WALLET || '11111111111111111111111111111111');

    // Resolve ATAs
  // dynamic import to avoid typing mismatches in @solana/spl-token typings
  const spl: any = await import('@solana/spl-token');
  const payerAta = await spl.getAssociatedTokenAddress(mintPubkey, payer.publicKey);
  const burnAta = await spl.getAssociatedTokenAddress(mintPubkey, burnWallet, true);
  const devAta = await spl.getAssociatedTokenAddress(mintPubkey, devWallet, true);

  // Determine decimals by fetching mint account
  const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
    let decimals = 0;
    try {
      // parsed info is under data.parsed.info.decimals
      // Fallback to 9 if not available
      // @ts-ignore
      decimals = Number(mintInfo.value?.data?.parsed?.info?.decimals) || 9;
    } catch (e) {
      decimals = 9;
    }

    const multiplier = 10 ** decimals;
    const burnAmountUi = burnAmount;
    const feeAmountUi = feeAmount;

    const tx = new Transaction();
    // If the payer is the mint authority, use burn instruction for burnAmount; otherwise transfer to burn wallet.
  const mintParsed = (mintInfo.value?.data as any)?.parsed?.info;
    const mintAuthority = mintParsed?.mintAuthority;
    let usedBurnInstruction = false;
    if (mintAuthority && String(mintAuthority) === String(payer.publicKey)) {
      try {
        tx.add(spl.createBurnInstruction(payerAta, mintPubkey, payer.publicKey, BigInt(Math.floor(burnAmountUi * multiplier))));
        // also transfer dev fee
        tx.add(spl.createTransferInstruction(payerAta, devAta, payer.publicKey, BigInt(Math.floor(feeAmountUi * multiplier))));
        usedBurnInstruction = true;
      } catch (e) {
        console.warn('Failed to create burn instruction, falling back to transfers', e);
        tx.add(spl.createTransferInstruction(payerAta, burnAta, payer.publicKey, BigInt(Math.floor(burnAmountUi * multiplier))));
        tx.add(spl.createTransferInstruction(payerAta, devAta, payer.publicKey, BigInt(Math.floor(feeAmountUi * multiplier))));
      }
    } else {
      tx.add(spl.createTransferInstruction(payerAta, burnAta, payer.publicKey, BigInt(Math.floor(burnAmountUi * multiplier))));
      tx.add(spl.createTransferInstruction(payerAta, devAta, payer.publicKey, BigInt(Math.floor(feeAmountUi * multiplier))));
    }

    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);

    // Simulate SOL->MISSU conversion via handleFee (it will be simulated by default)
  // Charge/record a small SOL fee and simulate conversion to MISSU (implementation in fee.ts)
  await handleFee();

    // Log to Supabase (db stubs will no-op safely)
    try {
      const { insertBurn } = await import('./db');
      if (insertBurn) await insertBurn({ mint, amount: burnAmountUi, fee: feeAmountUi, tx: sig });
    } catch (e) {
      // ignore logging errors
    }

    await ctx.reply(`✅ Burn complete!\n🔥 Burned: ${burnAmountUi} (${mint})\n💰 Dev Fee: ${feeAmountUi} (${mint})\n🌐 https://solscan.io/tx/${sig}`);
  } catch (err: any) {
    console.error('Burn failed', err);
    ctx.reply('Burn failed: ' + (err?.message || String(err)));
  }
});

bot.command('feed', async (ctx) => {
  await handleFee();
  const feed = await getFeed();
  if (!feed) return ctx.reply('No feed available.');
  ctx.reply(String(feed));
});

// Bonus: auto-post mode for Telegram channel
const CHANNEL_ID = config.TELEGRAM_CHANNEL_ID;
export async function postToChannel(message: string) {
  if (CHANNEL_ID) {
    await bot.telegram.sendMessage(CHANNEL_ID, message);
  }
}

async function start() {
  // Safety checks for live swap execution
  if (!config.SIMULATE_JUPITER_SWAP) {
    if (!config.ENABLE_LIVE_SWAPS) {
      console.error('SIMULATE_JUPITER_SWAP is false but ENABLE_LIVE_SWAPS is not true. Aborting startup to avoid accidental live swaps.');
      process.exit(1);
    }
    if ((config.NETWORK || 'mainnet') === 'mainnet' && !config.CONFIRM_MAINNET) {
      console.error('NETWORK=mainnet requires CONFIRM_MAINNET=true to perform live operations. Aborting.');
      process.exit(1);
    }
    if (!config.BOT_SOL_PAYER_SECRET) {
      console.error('BOT_SOL_PAYER_SECRET is required for live swap execution. Aborting.');
      process.exit(1);
    }
  }
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
    // Try to remove any webhook and start polling. If Telegram reports a 409 (another getUpdates)
    // we'll retry with exponential backoff a few times since the lock can be transient.
    try {
      const info = await bot.telegram.getWebhookInfo();
      console.log('Current Telegram webhook info:', info || '<none>');
    } catch (e) {
      // non-fatal, continue
      console.warn('Could not fetch webhook info (continuing)', e);
    }

    const maxAttempts = 6;
    let attempt = 0;
    let started = false;
    while (attempt < maxAttempts && !started) {
      attempt++;
      try {
        // Ensure webhook is removed and pending updates are dropped on the server
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        console.log('Deleted Telegram webhook (if present) to allow polling (attempt', attempt, ')');
      } catch (e) {
        console.warn('deleteWebhook failed (continuing). If you still get 409, make sure no other bot instance is running.', e);
      }

      try {
        // Drop pending updates to avoid processing a backlog
        await bot.launch({ dropPendingUpdates: true });
        console.log('Telegram bot polling started (dropPendingUpdates:true)');
        started = true;
        break;
      } catch (err: any) {
        const body = err?.response?.body || err?.body || {};
        const desc = body?.description || err?.message || String(err);
        console.error(`Failed to start bot polling (attempt ${attempt}):`, desc);

        // If it's a 409 conflict caused by another getUpdates, wait and retry
        const code = body?.error_code || err?.statusCode || err?.code;
        const isConflict = code === 409 || (typeof desc === 'string' && desc.includes('terminated by other getUpdates'));
        if (!isConflict) {
          // non-retryable error
          console.error('Non-retryable error while starting polling. Aborting.');
          process.exit(1);
        }

        // Otherwise, wait with exponential backoff and retry
        const waitMs = Math.min(30_000, 1000 * Math.pow(2, attempt - 1));
        console.log(`Received 409 conflict from Telegram. Will retry in ${waitMs}ms (attempt ${attempt}/${maxAttempts})`);
        await new Promise((res) => setTimeout(res, waitMs));
      }
    }

    if (!started) {
      console.error(`Failed to start polling after ${maxAttempts} attempts. Ensure no other bot instance is running and webhook is not set elsewhere.`);
      process.exit(1);
    }
  }
}

start().catch((err) => {
  console.error('Failed to start bot', err);
  process.exit(1);
});
