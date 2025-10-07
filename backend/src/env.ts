// Loads environment variables
export const config = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHANNEL_ID: process.env.TELEGRAM_CHANNEL_ID || '', // for auto-post mode
  HELIUS_API_KEY: process.env.HELIUS_API_KEY || '',
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
