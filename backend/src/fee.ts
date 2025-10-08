// Fee conversion logic
import { config } from './env';
import axios from 'axios';
// import { supabase } from './db'; // Supabase integration placeholder

export async function handleFee() {
  await convertSolFeeToMissu();
}

// Convert 0.001 SOL → MISSU via Jupiter and burn
export async function convertSolFeeToMissu() {
  const solLamports = 1000000; // 0.001 SOL
  const solAmount = solLamports / 1e9;

  const jupiterUrl = `${config.JUPITER_API_URL}/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${config.MISSU_MINT}&amount=${solLamports}&slippageBps=50`;

  try {
    const res = await axios.get(jupiterUrl, { timeout: 5000 });
    const quote = res.data;
    // If simulation mode, only log the expected MISSU amount
    if (config.SIMULATE_JUPITER_SWAP) {
      const expectedOut = quote?.outAmount || null;
      console.log(`Simulated Jupiter quote: ${solAmount} SOL -> ${expectedOut} MISSU`);
      const { insertFee } = await import('./db');
      if (insertFee) await insertFee({ solAmount, missuAmount: expectedOut });
      return { ok: true, simulated: true, quote };
    }
    // If we reach here, live swap is requested. Ensure explicit enable flags are set
    if (!config.ENABLE_LIVE_SWAPS) {
      console.error('ENABLE_LIVE_SWAPS is not true; refusing to execute live Jupiter swap.');
      return { ok: false, error: 'enable-live-swaps-required' };
    }
    // Dynamic import of solana libs and create payer
    const { Connection, Keypair, PublicKey } = await import('@solana/web3.js');
    const payerSecretRaw = config.BOT_SOL_PAYER_SECRET;
    if (!payerSecretRaw) return { ok: false, error: 'missing-payer-secret' };
  let payerKeypair: any;
    try {
      if (payerSecretRaw.trim().startsWith('[')) {
        payerKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(payerSecretRaw)));
      } else {
  const bs58: any = (await import('bs58')).default;
  payerKeypair = Keypair.fromSecretKey(bs58.decode(payerSecretRaw));
      }
    } catch (e) {
      console.error('Failed to parse BOT_SOL_PAYER_SECRET', e);
      return { ok: false, error: 'invalid-payer-secret' };
    }

    // Call Jupiter swap endpoint to build transactions
    try {
      const swapUrl = `${config.JUPITER_API_URL}/swap`;
      const body = {
        route: quote?.data?.[0],
        userPublicKey: payerKeypair.publicKey.toBase58(),
      };
      const swapRes = await axios.post(swapUrl, body, { timeout: 10000 });
      const swapData = swapRes.data;
      // swapData may contain unsigned transaction(s) as base64
      const rawTx = swapData?.swapTransaction || swapData?.swapTransactions?.[0];
      if (!rawTx) {
        console.error('No swap transaction returned by Jupiter', swapData);
        return { ok: false, error: 'no-swap-tx' };
      }

      const connection = new Connection(config.RPC_URL, 'confirmed');
      const txBuffer = Buffer.from(rawTx, 'base64');
      const { Transaction } = await import('@solana/web3.js');
      const transaction = Transaction.from(txBuffer);
      transaction.partialSign(payerKeypair);
      const sig = await connection.sendRawTransaction(transaction.serialize());
      await connection.confirmTransaction(sig, 'confirmed');

      const { insertFee } = await import('./db');
      if (insertFee) await insertFee({ solAmount, missuAmount: quote?.outAmount, tx: sig });

      console.log(`Executed Jupiter swap: ${solAmount} SOL -> ${quote?.outAmount} MISSU; tx=${sig}`);
      return { ok: true, simulated: false, tx: sig };
    } catch (e) {
      console.error('Jupiter swap execution failed', e);
      return { ok: false, error: e };
    }
  } catch (e) {
    console.error('Failed to fetch Jupiter quote', e);
    return { ok: false, error: e };
  }
}
