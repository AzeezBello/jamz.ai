-- Foundations for the dashboard work: guard the columns a client must not
-- write, keep the lyrics the studio collects, and report library totals that
-- do not depend on what is currently loaded or filtered.

-- ---------------------------------------------------------------------------
-- 1. Songs have an UPDATE policy so owners can rename and re-share them, but
--    that policy allowed writing *every* column. An owner could inflate
--    play_count and like_count, and — worse — set commercial_use = true, which
--    is a paid-plan entitlement granted from the subscription, not something
--    the browser gets to assert. Same guard pattern as profiles.
-- ---------------------------------------------------------------------------

create or replace function guard_privileged_song_columns()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.privileged_write', true) = 'on' then
    new.updated_at := now();
    return new;
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'a song cannot change owner' using errcode = 'check_violation';
  end if;
  if new.play_count is distinct from old.play_count then
    raise exception 'play_count is maintained by record_play()' using errcode = 'check_violation';
  end if;
  if new.like_count is distinct from old.like_count then
    raise exception 'like_count is maintained by toggle_like()' using errcode = 'check_violation';
  end if;
  if new.commercial_use is distinct from old.commercial_use then
    raise exception 'commercial_use follows your plan, not the client'
      using errcode = 'check_violation';
  end if;
  if new.duration_seconds is distinct from old.duration_seconds
     or new.model_version is distinct from old.model_version then
    raise exception 'generation metadata is immutable' using errcode = 'check_violation';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists songs_guard_privileged on songs;
create trigger songs_guard_privileged
  before update on songs
  for each row execute function guard_privileged_song_columns();

-- The two functions that legitimately move those counters announce themselves.
create or replace function record_play(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.privileged_write', 'on', true);
  update songs set play_count = play_count + 1
   where id = p_song_id
     and deleted_at is null
     and (visibility <> 'private' or user_id = auth.uid());
  perform set_config('app.privileged_write', 'off', true);
end;
$$;

create or replace function toggle_like(p_song_id uuid)
returns table (liked boolean, likes_total int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
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
    insert into likes (user_id, song_id) values (v_user, p_song_id) on conflict do nothing;
    v_liked := true;
  end if;

  perform set_config('app.privileged_write', 'on', true);
  update songs
     set like_count = (select count(*) from likes where song_id = p_song_id)
   where id = p_song_id
  returning songs.like_count into v_count;
  perform set_config('app.privileged_write', 'off', true);

  return query select v_liked, v_count;
end;
$$;

-- soft_delete_song and set_song_visibility write only columns the owner may
-- change, so they need no flag; mark_account_deleted runs as definer over many
-- rows and does.
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

  perform set_config('app.privileged_write', 'on', true);
  update songs set deleted_at = now(), visibility = 'private' where user_id = v_user;
  perform set_config('app.privileged_write', 'off', true);

  update profiles set deleted_at = now(), updated_at = now() where id = v_user;

  insert into audit_logs (actor_id, action, target_type, target_id)
  values (v_user, 'account.delete_requested', 'profile', v_user);
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Keep the lyrics the studio already collects. They were written into
--    generation_jobs.params and then dropped on the floor: songs.lyrics exists
--    but nothing ever populated it, so a user's words vanished at completion.
-- ---------------------------------------------------------------------------

create or replace function complete_generation_job(
  p_job_id       uuid,
  p_title        text,
  p_duration     int,
  p_storage_path text,
  p_bytes        bigint,
  p_format       text default 'wav',
  p_cover_url    text default null,
  p_model        text default 'jamz-v5'
)
returns songs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job        generation_jobs;
  v_song       songs;
  v_commercial boolean;
begin
  select * into v_job from generation_jobs where id = p_job_id for update;
  if not found or v_job.status <> 'running' then
    raise exception 'job_not_running' using errcode = 'check_violation';
  end if;

  select pl.commercial_use into v_commercial
    from profiles p join plans pl on pl.id = p.plan_id where p.id = v_job.user_id;

  insert into songs (user_id, project_id, title, prompt, style, lyrics, is_instrumental,
                     duration_seconds, cover_url, visibility, commercial_use, model_version)
  values (v_job.user_id, v_job.project_id, p_title, v_job.prompt,
          coalesce(v_job.params ->> 'style', ''),
          nullif(v_job.params ->> 'lyrics', ''),
          coalesce((v_job.params ->> 'instrumental')::boolean, false),
          p_duration, p_cover_url, 'private', coalesce(v_commercial, false), p_model)
  returning * into v_song;

  insert into audio_assets (song_id, user_id, kind, format, storage_path, bytes, duration_seconds)
  values (v_song.id, v_job.user_id, 'master', p_format, p_storage_path, p_bytes, p_duration);

  update generation_jobs
     set status = 'completed', progress = 100, status_message = 'Complete',
         song_id = v_song.id, finished_at = now(), updated_at = now()
   where id = p_job_id;

  insert into notifications (user_id, kind, title, body, link)
  values (v_job.user_id, 'generation_complete', 'Your song is ready',
          p_title, '/song/' || v_song.id::text);

  return v_song;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Library totals. The dashboard summed whatever rows were loaded, so the
--    "Total songs" figure changed as soon as you typed in the search box, and
--    would have been wrong again the moment the list was paginated.
-- ---------------------------------------------------------------------------

create or replace function library_stats()
returns table (
  song_count    int,
  play_total    bigint,
  like_total    bigint,
  public_count  int,
  seconds_total bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    count(*)::int,
    coalesce(sum(play_count), 0)::bigint,
    coalesce(sum(like_count), 0)::bigint,
    count(*) filter (where visibility = 'public')::int,
    coalesce(sum(duration_seconds), 0)::bigint
  from songs
  where user_id = auth.uid() and deleted_at is null;
$$;

revoke all on function guard_privileged_song_columns() from public, anon, authenticated;
grant execute on function library_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Songs need to be on the realtime publication for the library to update
--    itself. Without this the dashboard only ever showed what it fetched on
--    mount, so a song finishing on another device — or in a job started before
--    a reload — stayed invisible until a manual refresh.
-- ---------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table songs;
exception when duplicate_object then
  null;                                    -- already published
end;
$$;
