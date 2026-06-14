create table if not exists public.accounts (
  id text primary key,
  game_id text not null check (game_id in ('overwatch', 'valorant', 'arc')),
  image text,
  description text not null default '',
  info text not null default '',
  price numeric not null default 0,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'deleted')),
  delivered boolean not null default false,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

alter table public.accounts enable row level security;

drop policy if exists "Allow public read accounts" on public.accounts;
drop policy if exists "Allow public insert accounts" on public.accounts;
drop policy if exists "Allow public update accounts" on public.accounts;

create policy "Allow public read accounts"
on public.accounts
for select
to anon
using (true);

create policy "Allow public insert accounts"
on public.accounts
for insert
to anon
with check (true);

create policy "Allow public update accounts"
on public.accounts
for update
to anon
using (true)
with check (true);
