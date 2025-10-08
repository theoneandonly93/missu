import { getBurnLink } from '../src/missu.js';

(async () => {
  try {
    const RPC = process.env.RPC_URL || 'https://api.devnet.solana.com';
    process.env.RPC_URL = RPC;
    const mint = process.env.TEST_MINT || 'So11111111111111111111111111111111111111112';
    const amount = process.env.TEST_AMOUNT || '1';
    const wallet = process.env.TEST_WALLET || 'FWnEESnArQ9hHAPuQUicxHiwheH9UNuttZxf1soboqGH';
    console.log('Calling getBurnLink with', { mint, amount, wallet, RPC });
    const res = await getBurnLink(mint, amount, wallet);
    console.log('Result:\n', res);
  } catch (e) {
    console.error('Error running burnlink test', e);
    process.exit(1);
  }
})();
