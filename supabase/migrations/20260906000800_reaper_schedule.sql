-- Make stalled-job recovery independent of traffic.
--
-- Two gaps this closes, both found by watching real jobs stall at 95%:
--
-- 1. reap_stalled_jobs() was only ever invoked at the top of a *new* worker
--    request. A worker killed mid-job — the runtime's CPU limit, an OOM, a
--    deploy — left its job stuck in `running` forever. That holds the user's
--    credits and, on the free plan's single concurrency slot, locks them out
--    of generating anything until unrelated traffic happens to wake a worker.
--
-- 2. Requeuing alone was not enough. A requeued job still counts against
--    concurrency, and `attempts` only increments when a worker claims it, so a
--    queue nobody drains leaves the user blocked indefinitely. There is now a
--    maximum lifetime after which a job is failed and refunded outright, which
--    needs no worker and no scheduler beyond this one.

create extension if not exists pg_cron with schema extensions;

-- A job may not stay unfinished forever, whatever the reason.
create or replace function reap_stalled_jobs(
  p_max_lifetime interval default interval '10 minutes'
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_job   generation_jobs;
begin
  -- Give up entirely on anything too old, whether queued or running. This is
  -- the backstop that guarantees credits come back and the user is unblocked.
  for v_job in
    select * from generation_jobs
     where status in ('queued', 'running')
       and queued_at < now() - p_max_lifetime
     for update skip locked
  loop
    perform fail_generation_job(
      v_job.id, 'abandoned',
      'Generation did not finish in time. Your credits have been returned.');
    v_count := v_count + 1;
  end loop;

  -- Otherwise, recover work whose worker stopped renewing its lease.
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

revoke all on function reap_stalled_jobs(interval) from public, anon, authenticated;
grant execute on function reap_stalled_jobs(interval) to service_role;

-- The old zero-argument signature is superseded by the defaulted one.
drop function if exists reap_stalled_jobs();

select cron.schedule(
  'reap-stalled-generation-jobs',
  '* * * * *',
  $$select public.reap_stalled_jobs()$$
);
