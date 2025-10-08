import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import * as spl from '@solana/spl-token';

(async () => {
  try {
    const RPC = process.env.RPC_URL || 'https://api.devnet.solana.com';
    console.log('Using RPC:', RPC);
    const conn = new Connection(RPC, 'finalized');

    // Use a test mint and wallets (devnet). Defaults are generated on the fly.
  const mint = new PublicKey(process.env.TEST_MINT || 'So11111111111111111111111111111111111111112');
  const userKey = process.env.TEST_USER || Keypair.generate().publicKey.toString();
    const userPub = new PublicKey(userKey);
    const burnAddr = new PublicKey(process.env.BURN_WALLET || Keypair.generate().publicKey.toString());

    console.log('Mint:', mint.toBase58());
    console.log('User:', userPub.toBase58());
    console.log('Burn wallet:', burnAddr.toBase58());

    // Build burnlink (unsigned tx) ------------------------------------------------
    const userAta = await spl.Token.getAssociatedTokenAddress(
      spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      spl.TOKEN_PROGRAM_ID,
      mint,
      userPub
    );
    const burnAta = await spl.Token.getAssociatedTokenAddress(
      spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      spl.TOKEN_PROGRAM_ID,
      mint,
      burnAddr,
      true
    );

    const tx1 = new Transaction();
    // Add a transfer of 1 unit (raw amount) from userAta -> burnAta
    tx1.add(
      spl.Token.createTransferInstruction(
        spl.TOKEN_PROGRAM_ID,
        userAta,
        burnAta,
        userPub,
        [],
        1
      )
    );

    const latest = await conn.getLatestBlockhash('finalized');
    tx1.recentBlockhash = latest.blockhash;
    tx1.feePayer = userPub;

    const serialized = tx1.serialize({ requireAllSignatures: false }).toString('base64');
    console.log('\n=== /burnlink (unsigned) ===');
    console.log('Associated token account (user):', userAta.toBase58());
    console.log('Associated token account (burn):', burnAta.toBase58());
    console.log('Unsigned tx (base64):', serialized);
    console.log('Phantom deep link:', `https://phantom.app/ul/v1/transaction?txn=${encodeURIComponent(serialized)}`);

    // Build server-signed dry-run /burn ------------------------------------------------
    const payer = Keypair.generate();
    const dev = new PublicKey(process.env.DEV_FEE_WALLET || Keypair.generate().publicKey.toString());
    const payerAta = await spl.Token.getAssociatedTokenAddress(
      spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      spl.TOKEN_PROGRAM_ID,
      mint,
      payer.publicKey
    );
    const devAta = await spl.Token.getAssociatedTokenAddress(
      spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      spl.TOKEN_PROGRAM_ID,
      mint,
      dev,
      true
    );

    const tx2 = new Transaction();
    // Simulate sending 90 -> burn, 10 -> dev (raw units)
    tx2.add(
      spl.Token.createTransferInstruction(
        spl.TOKEN_PROGRAM_ID,
        payerAta,
        burnAta,
        payer.publicKey,
        [],
        90
      )
    );
    tx2.add(
      spl.Token.createTransferInstruction(
        spl.TOKEN_PROGRAM_ID,
        payerAta,
        devAta,
        payer.publicKey,
        [],
        10
      )
    );

    const latest2 = await conn.getLatestBlockhash('finalized');
    tx2.recentBlockhash = latest2.blockhash;
    tx2.feePayer = payer.publicKey;

    // Sign with payer (server-signed dry-run)
    tx2.sign(payer);
    const serialized2 = tx2.serialize().toString('base64');

    console.log('\n=== /burn (server-signed dry-run) ===');
    console.log('Payer:', payer.publicKey.toBase58());
    console.log('Payer ATA:', payerAta.toBase58());
    console.log('Dev ATA:', devAta.toBase58());
    console.log('Signed tx (base64):', serialized2);
    console.log('Signatures:', tx2.signatures.map(s => (s.signature ? Buffer.from(s.signature).toString('base64') : null)));

    console.log('\nDone. (Dry-run only — no broadcast was attempted.)');
  } catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
  }
})();
