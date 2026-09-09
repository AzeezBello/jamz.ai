-- Idempotency keys are supplied by the client and were used verbatim, but
-- credit_ledger.idempotency_key is globally unique. So one user's key
-- collided with another's:
--
--   * lyrics — apply_credit_delta() found the existing row and returned early
--     without charging. Replaying somebody else's key bought free lyrics.
--   * generation — the job lookup is scoped by user, so the insert instead hit
--     the unique constraint and errored. Not free, but one user could block
--     another by guessing keys.
--
-- Scoping the key to auth.uid() inside these functions closes both. The client
-- cannot influence the prefix, so it cannot reach another user's keys.

create or replace function debit_lyrics_credit(p_idempotency_key text)
returns int
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

  perform grant_daily_credits(v_user);

  return apply_credit_delta(
    v_user, -lyrics_cost(), 'lyrics_debit', 'lyrics', null,
    'lyrics:' || v_user::text || ':' || coalesce(p_idempotency_key, gen_random_uuid()::text)
  );
end;
$$;

create or replace function refund_lyrics_credit(p_idempotency_key text)
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

  perform apply_credit_delta(
    v_user, lyrics_cost(), 'lyrics_refund', 'lyrics', null,
    'lyrics-refund:' || v_user::text || ':' || coalesce(p_idempotency_key, '')
  );
end;
$$;

-- Same treatment for generation: the client's key is namespaced before it
-- reaches the globally unique column.
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
  values (v_user, p_project_id, btrim(p_prompt), coalesce(p_params, '{}'::jsonb), v_cost, v_key)
  returning * into v_job;

  perform apply_credit_delta(
    v_user, -v_cost, 'generation_debit', 'generation_job', v_job.id,
    'job:' || v_job.id::text
  );

  return v_job;
end;
$$;
