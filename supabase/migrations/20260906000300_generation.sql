-- Generation job lifecycle. Credits are debited in the same transaction that
-- creates the job, and refunded exactly once (enforced by the ledger's unique
-- idempotency_key) if the job ends in failure or cancellation.

create or replace function generation_cost(p_params jsonb default '{}'::jsonb)
returns int
language sql
immutable
as $$
  select 5;
$$;

-- ---------------------------------------------------------------------------
-- Client entry point. Debit + enqueue are atomic: if the debit raises, no job
-- exists; if the insert fails, no credits moved.
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
  v_job     generation_jobs;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_prompt is null or length(btrim(p_prompt)) < 3 then
    raise exception 'invalid_prompt: describe the song in at least 3 characters'
      using errcode = 'check_violation';
  end if;

  -- Replay of the same client request returns the original job.
  if p_idempotency_key is not null then
    select * into v_job from generation_jobs
      where idempotency_key = p_idempotency_key and user_id = v_user;
    if found then
      return v_job;
    end if;
  end if;

  perform grant_daily_credits(v_user);

  select pl.max_concurrent_jobs into v_limit
    from profiles p join plans pl on pl.id = p.plan_id
   where p.id = v_user;

  select count(*) into v_active
    from generation_jobs
   where user_id = v_user and status in ('queued', 'running');

  if v_active >= coalesce(v_limit, 1) then
    raise exception 'concurrency_limit: % generation(s) already in flight on your plan', v_active
      using errcode = 'check_violation';
  end if;

  v_cost := generation_cost(p_params);

  insert into generation_jobs (user_id, project_id, prompt, params, credits_cost, idempotency_key)
  values (v_user, p_project_id, btrim(p_prompt), coalesce(p_params, '{}'::jsonb), v_cost, p_idempotency_key)
  returning * into v_job;

  -- Raises `insufficient_credits`, rolling back the job insert above.
  perform apply_credit_delta(
    v_user, -v_cost, 'generation_debit', 'generation_job', v_job.id,
    'job:' || v_job.id::text
  );

  return v_job;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancellation. A queued job dies immediately and refunds; a running job is
-- flagged, and the worker refunds when it observes the flag between stages.
-- ---------------------------------------------------------------------------

create or replace function request_cancel_generation(p_job_id uuid)
returns generation_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_job  generation_jobs;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_job from generation_jobs
    where id = p_job_id and user_id = v_user for update;

  if not found then
    raise exception 'job_not_found' using errcode = 'no_data_found';
  end if;

  if v_job.status = 'queued' then
    perform refund_generation_job(v_job.id, 'cancelled');
    update generation_jobs
       set status = 'cancelled', cancel_requested = true, progress = 0,
           status_message = 'Cancelled', finished_at = now(), updated_at = now()
     where id = v_job.id
    returning * into v_job;
  elsif v_job.status = 'running' then
    update generation_jobs
       set cancel_requested = true, status_message = 'Cancelling…', updated_at = now()
     where id = v_job.id
    returning * into v_job;
  end if;

  return v_job;
end;
$$;

-- Refund is safe to call more than once: the ledger key and the `refunded`
-- flag both collapse repeats.
create or replace function refund_generation_job(p_job_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job generation_jobs;
begin
  select * into v_job from generation_jobs where id = p_job_id for update;
  if not found or v_job.refunded or v_job.credits_cost <= 0 then
    return;
  end if;

  perform apply_credit_delta(
    v_job.user_id, v_job.credits_cost, 'generation_refund_' || p_reason,
    'generation_job', v_job.id, 'refund:' || v_job.id::text
  );

  update generation_jobs set refunded = true, updated_at = now() where id = v_job.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Worker-side transitions (service_role only; see the grants at the bottom).
-- ---------------------------------------------------------------------------

create or replace function claim_generation_job(
  p_worker_id     text,
  p_lease_seconds int default 120
)
returns generation_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job generation_jobs;
begin
  select * into v_job
    from generation_jobs
   where status = 'queued' and not cancel_requested
   order by queued_at
   for update skip locked
   limit 1;

  if not found then
    return null;
  end if;

  update generation_jobs
     set status = 'running', attempts = attempts + 1, worker_id = p_worker_id,
         lease_expires_at = now() + make_interval(secs => p_lease_seconds),
         started_at = coalesce(started_at, now()),
         progress = 5, status_message = 'Analyzing prompt…', updated_at = now()
   where id = v_job.id
  returning * into v_job;

  return v_job;
end;
$$;

-- Returns true when the caller should abandon the job.
create or replace function report_job_progress(
  p_job_id  uuid,
  p_progress int,
  p_message text,
  p_lease_seconds int default 120
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cancel boolean;
begin
  update generation_jobs
     set progress = least(greatest(p_progress, 0), 100),
         status_message = p_message,
         lease_expires_at = now() + make_interval(secs => p_lease_seconds),
         updated_at = now()
   where id = p_job_id and status = 'running'
  returning cancel_requested into v_cancel;

  return coalesce(v_cancel, true);
end;
$$;

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
  v_job  generation_jobs;
  v_song songs;
  v_commercial boolean;
begin
  select * into v_job from generation_jobs where id = p_job_id for update;
  if not found or v_job.status <> 'running' then
    raise exception 'job_not_running' using errcode = 'check_violation';
  end if;

  select pl.commercial_use into v_commercial
    from profiles p join plans pl on pl.id = p.plan_id where p.id = v_job.user_id;

  insert into songs (user_id, project_id, title, prompt, style, is_instrumental,
                     duration_seconds, cover_url, visibility, commercial_use, model_version)
  values (v_job.user_id, v_job.project_id, p_title, v_job.prompt,
          coalesce(v_job.params ->> 'style', ''),
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

create or replace function fail_generation_job(
  p_job_id  uuid,
  p_code    text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform refund_generation_job(p_job_id, 'failed');
  update generation_jobs
     set status = 'failed', error_code = p_code, error_message = p_message,
         status_message = 'Failed', finished_at = now(), updated_at = now()
   where id = p_job_id and status in ('queued', 'running');
end;
$$;

create or replace function finish_cancelled_job(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform refund_generation_job(p_job_id, 'cancelled');
  update generation_jobs
     set status = 'cancelled', status_message = 'Cancelled',
         finished_at = now(), updated_at = now()
   where id = p_job_id and status in ('queued', 'running');
end;
$$;

-- Jobs whose worker died mid-flight: retried up to 3 times, then failed and
-- refunded. Wire this to pg_cron or an external scheduler.
create or replace function reap_stalled_jobs()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_job   generation_jobs;
begin
  for v_job in
    select * from generation_jobs
     where status = 'running' and lease_expires_at < now()
     for update skip locked
  loop
    if v_job.attempts >= 3 then
      perform fail_generation_job(v_job.id, 'worker_timeout', 'Generation timed out.');
    else
      update generation_jobs
         set status = 'queued', worker_id = null, lease_expires_at = null,
             progress = 0, status_message = 'Requeued after timeout', updated_at = now()
       where id = v_job.id;
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
