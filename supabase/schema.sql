-- Styl: run once in Supabase → SQL Editor → New query → Run.

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  prefs jsonb not null default '{}',
  onboarded boolean not null default false
);

create table if not exists items (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  image_path text not null,
  name text not null,
  category text not null,
  slot text not null,
  colours text[] not null default '{}',
  pattern text not null default 'Solid',
  formality text not null default 'casual',
  season text not null default 'all',
  styles text[] not null default '{}',
  brand text not null default '',
  notes text not null default '',
  favourite boolean not null default false,
  wear_count int not null default 0,
  last_worn date,
  lightness real,          -- 0 dark … 1 light, measured from the photo on device
  fit text,                -- slim | regular | relaxed | wide
  created_at timestamptz not null default now()
);
create index if not exists items_user on items (user_id, created_at desc);

create table if not exists outfits (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  item_ids uuid[] not null,
  occasion text not null,
  created_at timestamptz not null default now()
);

-- Row level security: every user sees only their own rows.
alter table profiles enable row level security;
alter table items enable row level security;
alter table outfits enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "own items" on items;
create policy "own items" on items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own outfits" on outfits;
create policy "own outfits" on outfits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Private photo bucket; files live under <user id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wardrobe', 'wardrobe', false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

drop policy if exists "own photos" on storage.objects;
create policy "own photos" on storage.objects for all
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);

-- Migration for projects created before 2026-11-14 (safe to re-run):
alter table items add column if not exists lightness real;
alter table items add column if not exists fit text;
