// Supabase DB client and helpers
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env';

let supabase: SupabaseClient | null = null;
if (config.SUPABASE_URL && config.SUPABASE_KEY) {
	supabase = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
}

export async function insertBurn(record: { mint: string; amount: number; fee: number; tx: string }) {
	try {
		if (supabase) {
			await supabase.from('burns').insert({ mint: record.mint, amount: record.amount, fee: record.fee, tx: record.tx });
		} else {
			console.log('insertBurn (no supabase):', record);
		}
	} catch (e) {
		console.error('insertBurn failed', e);
	}
}

export async function insertFee(record: { solAmount: number; missuAmount?: number; tx?: string }) {
	try {
		if (supabase) {
			await supabase.from('fees').insert({ sol_amount: record.solAmount, missu_amount: record.missuAmount || null, tx: record.tx || null });
		} else {
			console.log('insertFee (no supabase):', record);
		}
	} catch (e) {
		console.error('insertFee failed', e);
	}
}

export async function upsertTokenStats(mint: string, delta: { burned: number }) {
	try {
		if (supabase) {
			// simple upsert: increment burned amount
			const { data } = await supabase.from('token_stats').select('burned').eq('mint', mint).single();
			if (data) {
				await supabase.from('token_stats').update({ burned: Number(data.burned) + delta.burned }).eq('mint', mint);
			} else {
				await supabase.from('token_stats').insert({ mint, burned: delta.burned });
			}
		} else {
			console.log('upsertTokenStats (no supabase):', mint, delta);
		}
	} catch (e) {
		console.error('upsertTokenStats failed', e);
	}
}

export async function addSubscription(chatId: string, mint: string) {
	try {
		if (supabase) {
			await supabase.from('subscriptions').upsert({ chat_id: chatId, mint });
		} else {
			console.log('addSubscription', chatId, mint);
		}
	} catch (e) {
		console.error('addSubscription failed', e);
	}
}

export async function removeSubscription(chatId: string, mint: string) {
	try {
		if (supabase) {
			await supabase.from('subscriptions').delete().eq('chat_id', chatId).eq('mint', mint);
		} else {
			console.log('removeSubscription', chatId, mint);
		}
	} catch (e) {
		console.error('removeSubscription failed', e);
	}
}
