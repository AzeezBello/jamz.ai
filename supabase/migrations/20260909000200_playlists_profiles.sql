-- Playlists, a favourites view, and public creator pages.
--
-- likes and public_profiles have existed since the first migration with
-- nothing surfacing them: you could like a song and never find it again, and a
-- creator's name appeared on public songs with no page behind it.

create table playlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  title       text not null default 'Untitled playlist',
  description text not null default '',
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table playlist_songs (
  playlist_id uuid not null references playlists(id) on delete cascade,
  song_id     uuid not null references songs(id) on delete cascade,
  position    int  not null default 0,
  added_at    timestamptz not null default now(),
  primary key (playlist_id, song_id)
);

create index playlists_user_idx on playlists(user_id, updated_at desc);
create index playlist_songs_idx on playlist_songs(playlist_id, position);

alter table playlists      enable row level security;
alter table playlist_songs enable row level security;

create policy playlists_owner on playlists for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- A public playlist is readable by anyone, like a public song.
create policy playlists_public_read on playlists for select
  using (is_public and deleted_at is null);

create policy playlist_songs_visible on playlist_songs for select
  using (
    exists (
      select 1 from playlists p
       where p.id = playlist_songs.playlist_id
         and p.deleted_at is null
         and (p.user_id = auth.uid() or p.is_public)
    )
  );

create policy playlist_songs_owner_write on playlist_songs for all
  using (
    exists (select 1 from playlists p where p.id = playlist_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from playlists p where p.id = playlist_id and p.user_id = auth.uid())
  );

-- Songs the caller has liked, newest first. A plain join on likes would be
-- refused for songs the viewer does not own, so this runs as definer and
-- applies the same visibility rule the policies do.
create or replace function liked_songs(p_limit int default 50, p_offset int default 0)
returns setof songs
language sql
security definer
set search_path = public
stable
as $$
  select s.*
    from likes l
    join songs s on s.id = l.song_id
   where l.user_id = auth.uid()
     and s.deleted_at is null
     and (s.visibility <> 'private' or s.user_id = auth.uid())
   order by l.created_at desc
   limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

-- A creator's public page: their public songs and their totals.
create or replace function creator_profile(p_handle text)
returns table (
  id           uuid,
  handle       citext,
  display_name text,
  avatar_url   text,
  bio          text,
  created_at   timestamptz,
  song_count   int,
  play_total   bigint,
  like_total   bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.handle, p.display_name, p.avatar_url, p.bio, p.created_at,
         count(s.id)::int,
         coalesce(sum(s.play_count), 0)::bigint,
         coalesce(sum(s.like_count), 0)::bigint
    from profiles p
    left join songs s
      on s.user_id = p.id and s.visibility = 'public' and s.deleted_at is null
   where p.handle = p_handle and p.deleted_at is null
   group by p.id;
$$;

create or replace function creator_songs(p_handle text, p_limit int default 30)
returns setof songs
language sql
security definer
set search_path = public
stable
as $$
  select s.*
    from songs s
    join profiles p on p.id = s.user_id
   where p.handle = p_handle
     and p.deleted_at is null
     and s.visibility = 'public'
     and s.deleted_at is null
   order by s.play_count desc
   limit greatest(p_limit, 0);
$$;

grant execute on function liked_songs(int, int)      to authenticated;
grant execute on function creator_profile(text)      to anon, authenticated;
grant execute on function creator_songs(text, int)   to anon, authenticated;
