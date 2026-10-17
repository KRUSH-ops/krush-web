-- Run this once in your Supabase project's SQL Editor (web dashboard, no install needed).
-- Creates the one shared table KRUSH uses for every cross-device piece of data:
-- competitions, entries, votes, comments, wallets, roles — all of it.

create table if not exists krush_kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Row Level Security: only requests carrying your project's anon API key can read or write
-- this table at all (a stranger on the internet without that key gets nothing). This is the
-- same security model used by the vast majority of small hosted prototypes — it is NOT the
-- same as per-person password-protected accounts. See the note in the migration README about
-- when it's worth adding real user passwords on top of this.
alter table krush_kv enable row level security;

create policy "krush app can read" on krush_kv
  for select using (true);

create policy "krush app can write" on krush_kv
  for insert with check (true);

create policy "krush app can update" on krush_kv
  for update using (true);

create policy "krush app can delete" on krush_kv
  for delete using (true);
