-- Required extension for UUID defaults.
create extension if not exists pgcrypto;

-- Albums cache table.
create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  spotify_id text not null unique,
  name text not null,
  cover_url text,
  artist_name text not null,
  artists jsonb not null default '[]'::jsonb,
  release_date date,
  tracks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists albums_updated_at_idx on public.albums (updated_at desc);
create index if not exists albums_release_date_idx on public.albums (release_date desc);

-- Artist snapshot cache table.
create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  spotify_id text not null unique,
  name text not null,
  image_url text,
  genres jsonb not null default '[]'::jsonb,
  popularity int not null default 0,
  albums_snapshot jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists artists_updated_at_idx on public.artists (updated_at desc);

-- Anonymous rating table.
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  album_id text not null,
  main_score numeric(3,1) not null check (main_score >= 0 and main_score <= 10),
  production_score int not null check (production_score >= 0 and production_score <= 100),
  writing_score int not null check (writing_score >= 0 and writing_score <= 100),
  comment text not null default '',
  device_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ratings_album_device_unique unique (album_id, device_id),
  constraint ratings_album_fk foreign key (album_id) references public.albums (spotify_id) on delete cascade
);

create index if not exists ratings_album_id_idx on public.ratings (album_id);
create index if not exists ratings_device_id_idx on public.ratings (device_id);

-- Keep updated_at current on updates.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_albums_updated_at on public.albums;
create trigger set_albums_updated_at
before update on public.albums
for each row
execute function public.set_updated_at();

drop trigger if exists set_artists_updated_at on public.artists;
create trigger set_artists_updated_at
before update on public.artists
for each row
execute function public.set_updated_at();

drop trigger if exists set_ratings_updated_at on public.ratings;
create trigger set_ratings_updated_at
before update on public.ratings
for each row
execute function public.set_updated_at();

-- RLS policies for anonymous public app access.
alter table public.albums enable row level security;
alter table public.artists enable row level security;
alter table public.ratings enable row level security;

drop policy if exists albums_select_anon on public.albums;
create policy albums_select_anon on public.albums for select to anon using (true);

drop policy if exists albums_insert_anon on public.albums;
create policy albums_insert_anon on public.albums for insert to anon with check (true);

drop policy if exists albums_update_anon on public.albums;
create policy albums_update_anon on public.albums for update to anon using (true) with check (true);

drop policy if exists artists_select_anon on public.artists;
create policy artists_select_anon on public.artists for select to anon using (true);

drop policy if exists artists_insert_anon on public.artists;
create policy artists_insert_anon on public.artists for insert to anon with check (true);

drop policy if exists artists_update_anon on public.artists;
create policy artists_update_anon on public.artists for update to anon using (true) with check (true);

drop policy if exists ratings_select_anon on public.ratings;
create policy ratings_select_anon on public.ratings for select to anon using (true);

drop policy if exists ratings_insert_anon on public.ratings;
create policy ratings_insert_anon on public.ratings for insert to anon with check (true);

drop policy if exists ratings_update_anon on public.ratings;
create policy ratings_update_anon on public.ratings for update to anon using (true) with check (true);
