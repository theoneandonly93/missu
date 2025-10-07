create extension if not exists pgcrypto;

create table if not exists burns (
  id uuid primary key default gen_random_uuid(),
  mint text,
  symbol text,
  amount numeric,
  usd_value numeric,
  tx_signature text,
  timestamp timestamptz default now()
);

create table if not exists token_stats (
  mint text primary key,
  total_burned numeric default 0,
  current_supply numeric,
  percent_burned numeric generated always as (
    case
      when (total_burned + current_supply) > 0
      then (total_burned / (total_burned + current_supply) * 100)
      else 0
    end
  ) stored
);

create table if not exists subscriptions (
  chat_id text,
  mint text,
  created_at timestamptz default now(),
  primary key (chat_id, mint)
);

create table if not exists fees (
  id uuid primary key default gen_random_uuid(),
  sol_spent numeric,
  missu_bought numeric,
  tx_signature text,
  timestamp timestamptz default now()
);
