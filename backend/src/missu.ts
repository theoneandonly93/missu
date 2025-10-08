// MISSU bot logic: burns, tokens, subscriptions, feed
// import { supabase } from './db'; // Supabase integration placeholder
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
const splAny: any = spl;

export async function getBurns() {
  // Query recent burns from Supabase
  // ...implementation
  return 'Recent burns...';
}

export async function getTopTokens() {
  // Query top tokens by % burned
  // ...implementation
  return 'Top tokens...';
}

export async function getTokenStats(mint: string) {
  // Query stats for one token
  // ...implementation
  return `Stats for ${mint}...`;
}

export async function subscribe(chatId: string, mint: string) {
  // Add subscription in Supabase
  // ...implementation
}

export async function unsubscribe(chatId: string, mint: string) {
  // Remove subscription in Supabase
  // ...implementation
}

export async function getBurnLink(mint: string, amount: string, wallet?: string) {
  // If wallet is not provided, prompt the user to reply with their wallet address.
  if (!wallet) {
    return `To burn tokens, reply with your Solana wallet address. Example:\n/burnlink ${mint} ${amount} <YOUR_WALLET_ADDRESS>`;
  }
  // Try to construct an unsigned transaction the user can sign with their wallet.
  try {
    const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');

    const mintPubkey = new PublicKey(mint);
    const userPubkey = new PublicKey(wallet);
    const burnPubkey = new PublicKey(process.env.BURN_WALLET || '11111111111111111111111111111111');

    // Find user's associated token account for the mint (may not exist)
    const userAta = await spl.Token.getAssociatedTokenAddress(
      spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      spl.TOKEN_PROGRAM_ID,
      mintPubkey,
      userPubkey
    );
    const burnAta = await spl.Token.getAssociatedTokenAddress(
      spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      spl.TOKEN_PROGRAM_ID,
      mintPubkey,
      burnPubkey,
      true
    );

    // Fetch mint info to get decimals
    const mintAccount = await connection.getParsedAccountInfo(mintPubkey);
    const decimals = Number((mintAccount.value?.data as any)?.parsed?.info?.decimals) || 9;
    const amountUi = Number(amount);
    if (!Number.isFinite(amountUi) || amountUi <= 0) throw new Error('Invalid amount');
    const amountRaw = BigInt(Math.floor(amountUi * Number(10 ** decimals)));

    const tx = new Transaction();

    // Optimistic mode: always attach ATA creation instructions (user will be payer for both),
    // wallets that can't handle them will reject the tx.
    try {
      const ixUser = spl.Token.createAssociatedTokenAccountInstruction(
        spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        spl.TOKEN_PROGRAM_ID,
        mintPubkey,
        userAta,
        userPubkey,
        userPubkey
      );
      tx.add(ixUser);
    } catch (err) {
      console.warn('Failed to attach user ATA creation instruction (continuing optimistically)', err);
    }

    try {
      const ixBurn = spl.Token.createAssociatedTokenAccountInstruction(
        spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        spl.TOKEN_PROGRAM_ID,
        mintPubkey,
        burnAta,
        burnPubkey,
        userPubkey // user will pay to create the burn ATA
      );
      tx.add(ixBurn);
    } catch (err) {
      console.warn('Failed to attach burn ATA creation instruction (continuing optimistically)', err);
    }

    // Add transfer instruction (use spl.Token helper)
    const transferIx = spl.Token.createTransferInstruction(
      spl.TOKEN_PROGRAM_ID,
      userAta,
      burnAta,
      userPubkey,
      [],
      Number(amountRaw)
    );
    tx.add(transferIx);

    // Build unsigned transaction with fee payer = user
    const recent = await connection.getLatestBlockhash('finalized');
    tx.recentBlockhash = recent.blockhash;
    tx.feePayer = userPubkey;

    // Serialize unsigned transaction (requireAllSignatures=false) to base64
    const serialized = tx.serialize({ requireAllSignatures: false }).toString('base64');
    const encoded = encodeURIComponent(serialized);
    const phantomLink = `https://phantom.app/ul/v1/transaction?txn=${encoded}`;

    return `Unsigned transaction ready for ${wallet} to burn ${amount} of ${mint}.\n\n` +
      `1) Open this link in a browser on the device with your Phantom wallet:\n${phantomLink}\n\n` +
      `2) If your wallet supports transactions via deep link it will prompt to sign and send.\n\n` +
      `If your wallet does not accept the deep link, copy this base64 payload and import it into a wallet or signing tool:\n${serialized}\n\n` +
      `After signing and submitting the transaction, you can paste the transaction signature here and the bot will log it.`;
  } catch (e: any) {
    console.error('Failed to build unsigned tx for burnlink', e);
    // Fallback to instructions
    return `Received wallet ${wallet}. I couldn't build an unsigned transaction automatically (reason: ${String(e?.message || e)}).\n\n` +
      `Please manually send ${amount} ${mint} tokens from your wallet to the burn address:\n` +
      `${process.env.BURN_WALLET || '11111111111111111111111111111111'}\n\n` +
      `Or use the bot's auto-burn: /burn ${mint} ${amount}`;
  }
}
  /*
  // Step 2: If wallet address is provided, generate transaction
  const { PublicKey, Transaction, Connection } = await import('@solana/web3.js');
  const { createBurnInstruction } = await import('@solana/spl-token');
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const userWallet = new PublicKey(walletAddress);
  // Find user's token account for the mint
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(userWallet, { mint: new PublicKey(mint) });
  if (!tokenAccounts.value.length) return 'No token account found for this mint.';
  const tokenAccount = tokenAccounts.value[0].pubkey;
  // Create burn instruction
  const burnIx = createBurnInstruction(tokenAccount, new PublicKey(mint), userWallet, Number(amount));
  const tx = new Transaction().add(burnIx);
  // Serialize transaction (unsigned)
  const txBase64 = tx.serialize({ requireAllSignatures: false }).toString('base64');
  // Create Solana Pay link
  const solanaPayUrl = `https://phantom.app/solana-pay?transaction=${txBase64}`;
  return `Burn link: ${solanaPayUrl}`;
  */


export async function getFeed() {
  // Show how much SOL has been converted & burned in $MISSU
  // ...implementation
  return 'Total $MISSU burned by fees...';
}
