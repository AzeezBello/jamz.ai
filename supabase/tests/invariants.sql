-- Invariant smoke test.
--
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/invariants.sql
--
-- Runs inside one transaction and rolls back, so it is safe against a dev
-- database. Every check raises on failure, so a clean run means every
-- assertion below held.

begin;

do $$
declare
  v_user   uuid := gen_random_uuid();
  v_other  uuid := gen_random_uuid();
  v_job    generation_jobs;
  v_bal    int;
  v_before int;
  v_song   songs;
  v_failed boolean;
begin
  -- Create real auth users: profiles.id is a foreign key to auth.users, and
  -- going in this way also exercises the handle_new_user trigger.
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data)
  values
    ('00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated',
     'invariant-user@jamz.test', 'not-a-real-hash', now(), now(), now(),
     '{}'::jsonb, '{"display_name":"Test User"}'::jsonb),
    ('00000000-0000-0000-0000-000000000000', v_other, 'authenticated', 'authenticated',
     'invariant-other@jamz.test', 'not-a-real-hash', now(), now(), now(),
     '{}'::jsonb, '{"display_name":"Other User"}'::jsonb);

  ---------------------------------------------------------------------------
  raise notice '0. signup provisions a profile with the free daily allowance';
  ---------------------------------------------------------------------------
  select credit_balance into v_bal from profiles where id = v_user;
  if v_bal is null then
    raise exception 'FAIL: the auth.users trigger did not create a profile';
  end if;
  if v_bal <> 50 then
    raise exception 'FAIL: expected 50 signup credits, got %', v_bal;
  end if;
  if (select display_name from profiles where id = v_user) <> 'Test User' then
    raise exception 'FAIL: display_name was not taken from user metadata';
  end if;
  if (select count(*) from credit_ledger
       where user_id = v_user and reason = 'signup_grant') <> 1 then
    raise exception 'FAIL: the signup grant was not recorded in the ledger';
  end if;

  ---------------------------------------------------------------------------
  raise notice '1. credit_balance cannot be written outside the ledger';
  ---------------------------------------------------------------------------
  v_failed := false;
  begin
    update profiles set credit_balance = 999999 where id = v_user;
  exception when check_violation then
    v_failed := true;
  end;
  if not v_failed then
    raise exception 'FAIL: a direct UPDATE to credit_balance was allowed';
  end if;

  ---------------------------------------------------------------------------
  raise notice '2. plan_id cannot be self-assigned';
  ---------------------------------------------------------------------------
  v_failed := false;
  begin
    update profiles set plan_id = 'premier' where id = v_user;
  exception when check_violation then
    v_failed := true;
  end;
  if not v_failed then
    raise exception 'FAIL: a direct UPDATE to plan_id was allowed';
  end if;

  ---------------------------------------------------------------------------
  raise notice '3. apply_credit_delta is idempotent on its key';
  ---------------------------------------------------------------------------
  v_bal := apply_credit_delta(v_user, -5, 'test_debit', null, null, 'test:once');
  if v_bal <> 45 then raise exception 'FAIL: expected 45, got %', v_bal; end if;

  v_bal := apply_credit_delta(v_user, -5, 'test_debit', null, null, 'test:once');
  if v_bal <> 45 then
    raise exception 'FAIL: replaying an idempotency key moved the balance to %', v_bal;
  end if;

  if (select count(*) from credit_ledger where idempotency_key = 'test:once') <> 1 then
    raise exception 'FAIL: the replay wrote a second ledger row';
  end if;

  ---------------------------------------------------------------------------
  raise notice '4. a debit below zero is refused, not clamped';
  ---------------------------------------------------------------------------
  v_failed := false;
  begin
    perform apply_credit_delta(v_user, -1000, 'test_overdraw', null, null, 'test:overdraw');
  exception when check_violation then
    v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL: an overdraw succeeded'; end if;
  if (select credit_balance from profiles where id = v_user) <> 45 then
    raise exception 'FAIL: the refused debit still moved the balance';
  end if;

  ---------------------------------------------------------------------------
  raise notice '5. the daily grant tops up rather than accumulating';
  ---------------------------------------------------------------------------
  perform set_config('app.privileged_write', 'on', true);
  update profiles set daily_granted_on = current_date - 1 where id = v_user;
  perform set_config('app.privileged_write', 'off', true);

  v_bal := grant_daily_credits(v_user);
  if v_bal <> 50 then raise exception 'FAIL: expected a top-up to 50, got %', v_bal; end if;

  -- A second call on the same day must be a no-op.
  v_bal := grant_daily_credits(v_user);
  if v_bal <> 50 then raise exception 'FAIL: the grant ran twice in one day (%)', v_bal; end if;

  ---------------------------------------------------------------------------
  raise notice '6. enqueue debits, and cancelling refunds exactly once';
  ---------------------------------------------------------------------------
  -- enqueue_generation reads auth.uid(); impersonate the test user.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_user::text, 'role', 'authenticated')::text, true);

  v_before := (select credit_balance from profiles where id = v_user);
  v_job := enqueue_generation('a test song about invariants', '{}'::jsonb, null, 'test:job1');

  if v_job.status <> 'queued' then raise exception 'FAIL: job status %', v_job.status; end if;
  if (select credit_balance from profiles where id = v_user) <> v_before - 5 then
    raise exception 'FAIL: enqueue did not debit 5 credits';
  end if;

  -- Replaying the same client key returns the original job, no second charge.
  if (enqueue_generation('a test song about invariants', '{}'::jsonb, null, 'test:job1')).id
     <> v_job.id then
    raise exception 'FAIL: an idempotent enqueue created a second job';
  end if;
  if (select credit_balance from profiles where id = v_user) <> v_before - 5 then
    raise exception 'FAIL: the replayed enqueue charged twice';
  end if;

  perform request_cancel_generation(v_job.id);
  if (select status from generation_jobs where id = v_job.id) <> 'cancelled' then
    raise exception 'FAIL: a queued job did not cancel immediately';
  end if;
  if (select credit_balance from profiles where id = v_user) <> v_before then
    raise exception 'FAIL: cancelling did not refund';
  end if;

  -- Refunding again must not pay out a second time.
  perform refund_generation_job(v_job.id, 'cancelled');
  if (select credit_balance from profiles where id = v_user) <> v_before then
    raise exception 'FAIL: a double refund paid out twice';
  end if;

  ---------------------------------------------------------------------------
  raise notice '7. a running job is flagged for the worker, not killed';
  ---------------------------------------------------------------------------
  v_job := enqueue_generation('another test song', '{}'::jsonb, null, 'test:job2');
  perform set_config('request.jwt.claims', '', true);  -- act as service_role
  v_job := claim_generation_job('test-worker', 120);
  if v_job.status <> 'running' then raise exception 'FAIL: claim did not start the job'; end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_user::text, 'role', 'authenticated')::text, true);
  perform request_cancel_generation(v_job.id);

  if (select status from generation_jobs where id = v_job.id) <> 'running' then
    raise exception 'FAIL: a running job was terminated instead of flagged';
  end if;
  if not (select cancel_requested from generation_jobs where id = v_job.id) then
    raise exception 'FAIL: cancel_requested was not set';
  end if;

  -- The worker observes the flag through its progress call.
  perform set_config('request.jwt.claims', '', true);  -- act as service_role
  if report_job_progress(v_job.id, 50, 'Mixing…', 120) is not true then
    raise exception 'FAIL: the worker was not told to stop';
  end if;

  v_before := (select credit_balance from profiles where id = v_user);
  perform finish_cancelled_job(v_job.id);
  if (select status from generation_jobs where id = v_job.id) <> 'cancelled' then
    raise exception 'FAIL: the job did not reach cancelled';
  end if;
  if (select credit_balance from profiles where id = v_user) <> v_before + 5 then
    raise exception 'FAIL: the worker-side cancel did not refund';
  end if;

  ---------------------------------------------------------------------------
  raise notice '8. concurrency limit is enforced per plan';
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_user::text, 'role', 'authenticated')::text, true);
  perform enqueue_generation('concurrent one', '{}'::jsonb, null, 'test:job3');

  v_failed := false;
  begin
    perform enqueue_generation('concurrent two', '{}'::jsonb, null, 'test:job4');
  exception when check_violation then
    v_failed := true;
  end;
  if not v_failed then
    raise exception 'FAIL: the free plan allowed a second concurrent job';
  end if;

  ---------------------------------------------------------------------------
  raise notice '9. completing a job creates the song and keeps the charge';
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims', '', true);  -- act as service_role
  v_job := claim_generation_job('test-worker', 120);
  v_before := (select credit_balance from profiles where id = v_user);

  v_song := complete_generation_job(
    v_job.id, 'Concurrent One', 45, v_job.user_id::text || '/' || v_job.id::text || '.wav',
    123456, 'wav', '/images/song-1.jpg', 'mock');

  if v_song.title <> 'Concurrent One' then raise exception 'FAIL: song not created'; end if;
  if v_song.visibility <> 'private' then
    raise exception 'FAIL: new songs must default to private, got %', v_song.visibility;
  end if;
  if (select count(*) from audio_assets where song_id = v_song.id) <> 1 then
    raise exception 'FAIL: no audio asset recorded';
  end if;
  if (select credit_balance from profiles where id = v_user) <> v_before then
    raise exception 'FAIL: a completed job was refunded';
  end if;

  raise notice 'CREDIT AND JOB INVARIANTS HELD';
end;
$$;

-- Likes need the song created above, so they run in a second block.
do $$
declare
  v_song  uuid;
  v_other uuid;
  v_liked boolean;
  v_count int;
begin
  select id into v_song from songs order by created_at desc limit 1;
  select id into v_other from profiles where display_name = 'Other User';
  if v_song is null then raise exception 'FAIL: no song to like'; end if;

  perform set_config('request.jwt.claims', '', true);  -- act as service_role
  update songs set visibility = 'public' where id = v_song;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_other::text, 'role', 'authenticated')::text, true);

  select liked, likes_total into v_liked, v_count from toggle_like(v_song);
  if not v_liked or v_count <> 1 then
    raise exception 'FAIL: first like gave liked=% count=%', v_liked, v_count;
  end if;

  select liked, likes_total into v_liked, v_count from toggle_like(v_song);
  if v_liked or v_count <> 0 then
    raise exception 'FAIL: unlike gave liked=% count=%', v_liked, v_count;
  end if;

  raise notice 'ALL INVARIANTS HELD';
end;
$$;

rollback;
