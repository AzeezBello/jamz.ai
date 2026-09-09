-- Composer features: model entitlement, creative settings, a user-supplied
-- title, and reference uploads.

-- ---------------------------------------------------------------------------
-- 1. Which models a plan may use. The pricing page already promises "Access to
--    latest v5 model" on paid tiers, so make that real and enforce it where the
--    browser cannot reach it.
-- ---------------------------------------------------------------------------

alter table plans
  add column if not exists models text[] not null default array['v4.5'];

update plans set models = array['v4.5']        where id = 'free';
update plans set models = array['v4.5', 'v5']  where id in ('pro', 'premier');

-- Settings the composer captured, kept so a variation can reuse them and the
-- song page can show how it was made.
alter table songs
  add column if not exists settings jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 2. Reference uploads. Stored and owned properly now; the generator does not
--    condition on them yet, and the UI says so rather than implying otherwise.
-- ---------------------------------------------------------------------------

create type reference_kind as enum ('audio', 'voice', 'inspo');

create table reference_uploads (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  kind         reference_kind not null,
  filename     text not null,
  storage_path text not null,
  bytes        bigint not null default 0,
  content_type text not null default '',
  created_at   timestamptz not null default now()
);

create index reference_uploads_user_idx on reference_uploads(user_id, created_at desc);

alter table reference_uploads enable row level security;

create policy reference_uploads_own on reference_uploads for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. enqueue_generation: validate the model against the caller's plan, accept
--    a chosen title, and carry the creative settings through.
-- ---------------------------------------------------------------------------

create or replace function enqueue_generation(
  p_prompt          text,
  p_params          jsonb default '{}'::jsonb,
  p_project_id      uuid  default null,
  p_idempotency_key text  default null
)
returns generation_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_cost    int;
  v_active  int;
  v_limit   int;
  v_models  text[];
  v_model   text;
  v_job     generation_jobs;
  v_key     text;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_prompt is null or length(btrim(p_prompt)) < 3 then
    raise exception 'invalid_prompt: describe the song in at least 3 characters'
      using errcode = 'check_violation';
  end if;

  v_key := case
    when p_idempotency_key is null then null
    else v_user::text || ':' || p_idempotency_key
  end;

  if v_key is not null then
    select * into v_job from generation_jobs
      where idempotency_key = v_key and user_id = v_user;
    if found then
      return v_job;
    end if;
  end if;

  perform grant_daily_credits(v_user);

  select pl.max_concurrent_jobs, pl.models into v_limit, v_models
    from profiles p join plans pl on pl.id = p.plan_id
   where p.id = v_user;

  -- Model entitlement. Defaulting to the plan's first model means an omitted
  -- or unknown choice degrades to something the user is allowed to use.
  v_model := coalesce(nullif(p_params ->> 'model', ''), v_models[1]);
  if not (v_model = any(v_models)) then
    raise exception 'model_not_available: % is not included in your plan', v_model
      using errcode = 'check_violation';
  end if;
  p_params := jsonb_set(coalesce(p_params, '{}'::jsonb), '{model}', to_jsonb(v_model));

  select count(*) into v_active
    from generation_jobs
   where user_id = v_user and status in ('queued', 'running');

  if v_active >= coalesce(v_limit, 1) then
    raise exception 'concurrency_limit: % generation(s) already in flight on your plan', v_active
      using errcode = 'check_violation';
  end if;

  v_cost := generation_cost(p_params);

  insert into generation_jobs (user_id, project_id, prompt, params, credits_cost, idempotency_key)
  values (v_user, p_project_id, btrim(p_prompt), p_params, v_cost, v_key)
  returning * into v_job;

  perform apply_credit_delta(
    v_user, -v_cost, 'generation_debit', 'generation_job', v_job.id,
    'job:' || v_job.id::text
  );

  return v_job;
end;
$$;

-- Completion honours a chosen title and records the settings used.
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
  v_title      text;
begin
  select * into v_job from generation_jobs where id = p_job_id for update;
  if not found or v_job.status <> 'running' then
    raise exception 'job_not_running' using errcode = 'check_violation';
  end if;

  select pl.commercial_use into v_commercial
    from profiles p join plans pl on pl.id = p.plan_id where p.id = v_job.user_id;

  -- A title the user typed wins over the one derived from the prompt.
  v_title := coalesce(nullif(btrim(v_job.params ->> 'title'), ''), p_title);

  insert into songs (user_id, project_id, title, prompt, style, lyrics, is_instrumental,
                     duration_seconds, cover_url, visibility, commercial_use, model_version,
                     settings)
  values (v_job.user_id, v_job.project_id, v_title, v_job.prompt,
          coalesce(v_job.params ->> 'style', ''),
          nullif(v_job.params ->> 'lyrics', ''),
          coalesce((v_job.params ->> 'instrumental')::boolean, false),
          p_duration, p_cover_url, 'private', coalesce(v_commercial, false),
          coalesce(nullif(v_job.params ->> 'model', ''), p_model),
          coalesce(v_job.params, '{}'::jsonb) - 'lyrics' - 'seed')
  returning * into v_song;

  insert into audio_assets (song_id, user_id, kind, format, storage_path, bytes, duration_seconds)
  values (v_song.id, v_job.user_id, 'master', p_format, p_storage_path, p_bytes, p_duration);

  update generation_jobs
     set status = 'completed', progress = 100, status_message = 'Complete',
         song_id = v_song.id, finished_at = now(), updated_at = now()
   where id = p_job_id;

  insert into notifications (user_id, kind, title, body, link)
  values (v_job.user_id, 'generation_complete', 'Your song is ready',
          v_title, '/song/' || v_song.id::text);

  return v_song;
end;
$$;
