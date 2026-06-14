create table if not exists public.accounts (
  id text primary key,
  game_id text not null check (game_id in ('overwatch', 'valorant', 'arc')),
  image text,
  description text not null default '',
  info text not null default '',
  price numeric not null default 0,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'sold', 'deleted')),
  delivered boolean not null default false,
  sold boolean not null default false,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

alter table public.accounts add column if not exists sold boolean not null default false;
alter table public.accounts drop constraint if exists accounts_status_check;
alter table public.accounts add constraint accounts_status_check check (status in ('pending', 'delivered', 'sold', 'deleted'));

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
