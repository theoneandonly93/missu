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
    const userAta = await splAny.getAssociatedTokenAddress(mintPubkey, userPubkey);
    const burnAta = await splAny.getAssociatedTokenAddress(mintPubkey, burnPubkey, true);

    // Fetch mint info to get decimals
    const mintAccount = await connection.getParsedAccountInfo(mintPubkey);
    const decimals = Number((mintAccount.value?.data as any)?.parsed?.info?.decimals) || 9;
    const amountUi = Number(amount);
    if (!Number.isFinite(amountUi) || amountUi <= 0) throw new Error('Invalid amount');
    const amountRaw = BigInt(Math.floor(amountUi * Number(10 ** decimals)));

    const tx = new Transaction();

    // If user's ATA doesn't exist, try to add an ATA creation instruction (if available)
    const ataInfo = await connection.getAccountInfo(userAta);
    if (!ataInfo) {
      // Attempt to create ATA instruction using spl helpers if available
      if (typeof splAny.createAssociatedTokenAccountInstruction === 'function') {
        try {
          // createAssociatedTokenAccountInstruction(payer, associatedToken, owner, mint)
          const ix = splAny.createAssociatedTokenAccountInstruction(userPubkey, userAta, userPubkey, mintPubkey);
          tx.add(ix);
        } catch (err) {
          console.warn('Failed to add createAssociatedTokenAccountInstruction', err);
        }
      } else if (typeof splAny.createAssociatedTokenAccount === 'function') {
        // Some versions expose createAssociatedTokenAccount which returns a promise of the ATA public key;
        // we cannot run it here since it may submit a transaction. Fall back to manual instructions.
        console.warn('spl.createAssociatedTokenAccount exists but cannot be used to build unsigned tx here');
      } else {
        // No helper available to create ATA programmatically; return manual instructions
        return `Received wallet ${wallet}. Your associated token account for ${mint} does not exist, and I cannot construct the ATA creation instruction automatically.\n\n` +
          `Please create an associated token account for this mint and your wallet (one-time):\n` +
          `You can use the Phantom wallet UI or the Solana CLI:\n` +
          `  spl-token create-account ${mint} --owner ${wallet}\n\n` +
          `After creating the ATA, run:\n/burnlink ${mint} ${amount} ${wallet}`;
      }
    }

    // Add transfer instruction
    const transferIx = splAny.createTransferInstruction(userAta, burnAta, userPubkey, amountRaw);
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
