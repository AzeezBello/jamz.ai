-- claim_generation_job returned a bare composite type, so an empty queue
-- produced a row of NULLs rather than no row at all. Through PostgREST that
-- serialises as {"id": null, "prompt": null, ...} — an object, and therefore
-- truthy in JavaScript. The worker's "nothing left to do, stop" check never
-- fired.
--
-- It then ran the whole generation pipeline against that null job — synthesis,
-- an upload to `null/null.wav`, a completion call that errored — and looped for
-- its entire time budget, roughly twenty times per invocation. That burned CPU
-- until the runtime killed the isolate, which also killed whatever real job
-- happened to share it, leaving genuine jobs stranded mid-render.
--
-- `setof` returns zero rows instead, which PostgREST renders as [].

drop function if exists claim_generation_job(text, integer);

create or replace function claim_generation_job(
  p_worker_id     text,
  p_lease_seconds int default 120
)
returns setof generation_jobs
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
    return;                                  -- zero rows, not a row of nulls
  end if;

  update generation_jobs
     set status = 'running', attempts = attempts + 1, worker_id = p_worker_id,
         lease_expires_at = now() + make_interval(secs => p_lease_seconds),
         started_at = coalesce(started_at, now()),
         progress = 5, status_message = 'Analyzing prompt…', updated_at = now()
   where id = v_job.id
  returning * into v_job;

  return next v_job;
end;
$$;

revoke all on function claim_generation_job(text, integer) from public, anon, authenticated;
grant execute on function claim_generation_job(text, integer) to service_role;
