// Helius webhook handler and burn event parser
import express from 'express';
// import { supabase } from './db'; // Supabase integration placeholder
import { postToChannel } from './bot';

const app = express();
app.use(express.json());

app.post('/api/helius', async (req, res) => {
  // Parse burn event, get mint, amount, USD value
  // Save to Supabase
  // Announce in Telegram (DMs and/or channel)
  const burn = req.body;
  // ...parse burn
  // await supabase.from('burns').insert({ ... });
  // await postToChannel('🔥 $TOKEN burned ...');
  res.sendStatus(200);
});

export function postBurnToChannel(message: string) {
  postToChannel(message);
}

app.listen(Number(process.env.PORT || 5000), () => {
  console.log(`Express listening on :${process.env.PORT || 5000}`);
});
