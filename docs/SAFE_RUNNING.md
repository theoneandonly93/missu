Run the bot (safely)

Environment variables (examples)

```env
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
BOT_SOL_PAYER_SECRET=[1,2,3,...]            # JSON array of secret key bytes (recommended)
# or BOT_SOL_PAYER_SECRET=base58string      # base58 encoded secret key
DEV_FEE_WALLET=YourDevWalletPubkey
DEV_FEE_PERCENT=1
SIMULATE_JUPITER_SWAP=true                 # default: simulate quotes, do NOT execute swaps
ENABLE_LIVE_SWAPS=false                    # must be true to run live swaps
NETWORK=devnet                             # devnet or mainnet
CONFIRM_MAINNET=false                      # must be true to allow mainnet live ops
JUPITER_API_URL=https://quote-api.jup.ag/v6
RPC_URL=https://api.mainnet-beta.solana.com
```

Testing locally

1. Use `NETWORK=devnet` and `SIMULATE_JUPITER_SWAP=true` to test without executing swaps.
2. Start the bot:

```bash
bun run backend/src/bot.ts
```

3. Send `/burn <mint> <amount>` to your bot and watch logs.

Enabling live swaps (mainnet)

To enable live swaps on mainnet you must explicitly set all the following environment variables:

- `SIMULATE_JUPITER_SWAP=false`
- `ENABLE_LIVE_SWAPS=true`
- `CONFIRM_MAINNET=true`
- `BOT_SOL_PAYER_SECRET` set and funded

Security

- Never commit private keys to the repo. Use your hosting platform's secret store.
- Test on devnet thoroughly before switching to mainnet.

Notes

- Currently the Jupiter swap execution is gated behind the safety flags. The code will fetch quotes by default and simulate conversions. Full live swap execution and stricter Supabase logging are available when you opt in.
