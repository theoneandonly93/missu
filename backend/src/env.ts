// Loads environment variables
export const config = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHANNEL_ID: process.env.TELEGRAM_CHANNEL_ID || '', // for auto-post mode
  // If set, bot will run in webhook mode and listen on PORT. Example: https://your-domain.com
  TELEGRAM_WEBHOOK_URL: process.env.TELEGRAM_WEBHOOK_URL || '',
  HELIUS_API_KEY: process.env.HELIUS_API_KEY || '',
  DEV_FEE_WALLET: process.env.DEV_FEE_WALLET || '',
  DEV_FEE_PERCENT: process.env.DEV_FEE_PERCENT || '1',
  // When true, Jupiter swaps will be simulated (no on-chain swap executed)
  SIMULATE_JUPITER_SWAP: (process.env.SIMULATE_JUPITER_SWAP || 'true') === 'true',
  // Network selection: 'devnet' or 'mainnet'
  NETWORK: process.env.NETWORK || 'mainnet',
  // Require explicit opt-in to enable live swaps
  ENABLE_LIVE_SWAPS: (process.env.ENABLE_LIVE_SWAPS || 'false') === 'true',
  // Extra safety: must explicitly confirm mainnet actions
  CONFIRM_MAINNET: (process.env.CONFIRM_MAINNET || 'false') === 'true',
  // BOT_SOL_PAYER_SECRET may be a JSON array (recommended) or base58 string; parsing handled at runtime
  JUPITER_API_URL: process.env.JUPITER_API_URL || 'https://quote-api.jup.ag/v6',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_KEY: process.env.SUPABASE_KEY || '',
  MISSU_MINT: process.env.MISSU_MINT || '',
  BURN_WALLET: process.env.BURN_WALLET || '11111111111111111111111111111111',
  BOT_SOL_PAYER_SECRET: process.env.BOT_SOL_PAYER_SECRET || '',
  BIRDEYE_API_KEY: process.env.BIRDEYE_API_KEY || '',
  RPC_URL: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  PORT: process.env.PORT || '5000',
};
