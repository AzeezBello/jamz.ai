-- Moderation. The reports and audit_logs tables have existed since the first
-- migration and nothing ever wrote to or read from them, so a public song had
-- no route to being reported and no one had a way to act on it.

-- Who is allowed to moderate. Kept as a table rather than a flag on profiles so
-- the grant itself is auditable and revocable, and so it cannot be set by the
-- profile update path a user controls.
create table moderators (
  user_id    uuid primary key references profiles(id) on delete cascade,
  granted_by uuid references profiles(id) on delete set null,
  granted_at timestamptz not null default now()
);

alter table moderators enable row level security;
-- No policies: readable and writable only by service_role. A moderator cannot
-- see, add or remove other moderators from the browser.

create or replace function is_moderator(p_user uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from moderators where user_id = p_user);
$$;

-- ---------------------------------------------------------------------------
-- Reporting a song
-- ---------------------------------------------------------------------------

alter table reports
  add column if not exists resolution     text,
  add column if not exists resolved_by    uuid references profiles(id) on delete set null,
  add column if not exists reporter_note  text;

-- One open report per person per song: a second submission updates the first
-- rather than letting one user flood the queue.
create unique index if not exists reports_one_open_per_reporter
  on reports (song_id, reporter_id)
  where status = 'open';

create or replace function report_song(
  p_song_id uuid,
  p_reason  text,
  p_details text default ''
)
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

  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'invalid_reason: choose why you are reporting this'
      using errcode = 'check_violation';
  end if;

  -- Only songs the reporter can actually see can be reported, so this cannot
  -- be used to probe for the existence of private songs.
  perform 1 from songs
   where id = p_song_id and deleted_at is null and visibility <> 'private';
  if not found then
    raise exception 'song_not_found' using errcode = 'no_data_found';
  end if;

  insert into reports (song_id, reporter_id, reason, details)
  values (p_song_id, v_user, btrim(p_reason), coalesce(btrim(p_details), ''))
  on conflict (song_id, reporter_id) where status = 'open'
  do update set reason = excluded.reason, details = excluded.details;
end;
$$;

-- ---------------------------------------------------------------------------
-- The moderator queue
-- ---------------------------------------------------------------------------

create or replace function moderation_queue(p_status report_status default 'open')
returns table (
  id            uuid,
  song_id       uuid,
  song_title    text,
  song_visible  song_visibility,
  owner_name    text,
  reason        text,
  details       text,
  status        report_status,
  report_count  int,
  created_at    timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select r.id,
         r.song_id,
         s.title,
         s.visibility,
         p.display_name,
         r.reason,
         r.details,
         r.status,
         (select count(*)::int from reports r2 where r2.song_id = r.song_id),
         r.created_at
    from reports r
    join songs s    on s.id = r.song_id
    join profiles p on p.id = s.user_id
   where is_moderator() and r.status = p_status
   order by r.created_at;
$$;

-- Acting on a report. Every outcome is written to audit_logs, which also had
-- no writer before now.
create or replace function resolve_report(
  p_report_id uuid,
  p_action    text,          -- 'dismiss' | 'unlist' | 'remove'
  p_note      text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_report reports;
begin
  if not is_moderator(v_user) then
    raise exception 'not_a_moderator' using errcode = '42501';
  end if;

  select * into v_report from reports where id = p_report_id for update;
  if not found then
    raise exception 'report_not_found' using errcode = 'no_data_found';
  end if;

  perform set_config('app.privileged_write', 'on', true);

  if p_action = 'unlist' then
    update songs set visibility = 'unlisted', updated_at = now() where id = v_report.song_id;
  elsif p_action = 'remove' then
    update songs set deleted_at = now(), visibility = 'private', updated_at = now()
     where id = v_report.song_id;
  elsif p_action <> 'dismiss' then
    perform set_config('app.privileged_write', 'off', true);
    raise exception 'unknown_action: %', p_action using errcode = 'check_violation';
  end if;

  perform set_config('app.privileged_write', 'off', true);

  update reports
     set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end,
         resolution = p_action,
         resolved_by = v_user,
         resolved_at = now()
   where id = p_report_id;

  -- Close every other open report on the same song; they are about this ruling.
  update reports
     set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end,
         resolution = p_action, resolved_by = v_user, resolved_at = now()
   where song_id = v_report.song_id and status = 'open' and id <> p_report_id;

  insert into audit_logs (actor_id, action, target_type, target_id, metadata)
  values (v_user, 'report.' || p_action, 'song', v_report.song_id,
          jsonb_build_object('report_id', p_report_id, 'note', p_note));

  -- Tell the owner what happened, unless the report was dismissed.
  if p_action <> 'dismiss' then
    insert into notifications (user_id, kind, title, body, link)
    select s.user_id, 'moderation',
           case when p_action = 'remove' then 'A song was removed'
                else 'A song was unlisted' end,
           s.title, '/legal/terms'
      from songs s where s.id = v_report.song_id;
  end if;
end;
$$;

grant execute on function report_song(uuid, text, text)              to authenticated;
grant execute on function moderation_queue(report_status)            to authenticated;
grant execute on function resolve_report(uuid, text, text)           to authenticated;
grant execute on function is_moderator(uuid)                         to authenticated;
