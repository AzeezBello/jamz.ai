-- Catalogue mutations (plays, likes, sharing, deletion) and the public
-- projection of a profile.

-- Column-limited projection so one creator's display name can be read on a
-- public song page without exposing credits or Stripe ids.
create view public_profiles
with (security_barrier = true) as
  select id, handle, display_name, avatar_url, bio, created_at
    from profiles
   where deleted_at is null;

create or replace function record_play(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update songs set play_count = play_count + 1
   where id = p_song_id
     and deleted_at is null
     and (visibility <> 'private' or user_id = auth.uid());
end;
$$;

-- Returns the song's like count after the toggle so the client can reconcile.
create or replace function toggle_like(p_song_id uuid)
returns table (liked boolean, likes_total int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_liked boolean;
  v_count int;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  perform 1 from songs
   where id = p_song_id and deleted_at is null
     and (visibility <> 'private' or user_id = v_user);
  if not found then
    raise exception 'song_not_found' using errcode = 'no_data_found';
  end if;

  delete from likes where user_id = v_user and song_id = p_song_id;
  if found then
    v_liked := false;
  else
    insert into likes (user_id, song_id) values (v_user, p_song_id)
      on conflict do nothing;
    v_liked := true;
  end if;

  -- Recount rather than increment, so a double-submit cannot drift the total.
  update songs
     set like_count = (select count(*) from likes where likes.song_id = p_song_id)
   where id = p_song_id
  returning songs.like_count into v_count;

  return query select v_liked, v_count;
end;
$$;

create or replace function set_song_visibility(p_song_id uuid, p_visibility song_visibility)
returns songs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_song songs;
begin
  update songs set visibility = p_visibility, updated_at = now()
   where id = p_song_id and user_id = auth.uid() and deleted_at is null
  returning * into v_song;

  if not found then
    raise exception 'song_not_found' using errcode = 'no_data_found';
  end if;

  if p_visibility = 'private' then
    update public_shares set revoked_at = now()
     where song_id = p_song_id and revoked_at is null;
  end if;

  return v_song;
end;
$$;

create or replace function soft_delete_song(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update songs set deleted_at = now(), visibility = 'private', updated_at = now()
   where id = p_song_id and user_id = auth.uid() and deleted_at is null;

  if not found then
    raise exception 'song_not_found' using errcode = 'no_data_found';
  end if;
end;
$$;

-- Account deletion: cascades from auth.users, so this marks the profile and
-- lets the edge function remove the auth user with the service key.
create or replace function mark_account_deleted()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  update songs set deleted_at = now(), visibility = 'private' where user_id = v_user;
  update profiles set deleted_at = now(), updated_at = now() where id = v_user;

  insert into audit_logs (actor_id, action, target_type, target_id)
  values (v_user, 'account.delete_requested', 'profile', v_user);
end;
$$;

create or replace function mark_notifications_read(p_ids uuid[] default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update notifications set read_at = now()
   where user_id = auth.uid() and read_at is null
     and (p_ids is null or id = any(p_ids));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
