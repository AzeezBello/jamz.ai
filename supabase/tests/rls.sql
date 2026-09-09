-- Row-level security tests.
--
-- The invariants suite runs as `postgres`, which bypasses RLS entirely, so it
-- proves the trigger guards but says nothing about the policies. This one
-- switches to the `authenticated` and `anon` roles the browser actually uses.
--
--   docker exec -i supabase_db_jamz psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/rls.sql

begin;

-- Fixed ids so the role-switched sections can refer to them as literals.
\set alice '11111111-1111-1111-1111-111111111111'
\set bob   '22222222-2222-2222-2222-222222222222'
\set priv  '33333333-3333-3333-3333-333333333333'
\set pub   '44444444-4444-4444-4444-444444444444'

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', :'alice', 'authenticated', 'authenticated',
   'alice@jamz.test', 'x', now(), now(), now(), '{}'::jsonb, '{"display_name":"Alice"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', :'bob', 'authenticated', 'authenticated',
   'bob@jamz.test', 'x', now(), now(), now(), '{}'::jsonb, '{"display_name":"Bob"}'::jsonb);

insert into songs (id, user_id, title, prompt, visibility, duration_seconds)
values (:'priv', :'alice', 'Alice Private', 'secret', 'private', 30),
       (:'pub',  :'alice', 'Alice Public',  'shared', 'public',  30);

insert into audio_assets (song_id, user_id, storage_path, bytes, duration_seconds)
values (:'priv', :'alice', 'alice/priv.wav', 100, 30),
       (:'pub',  :'alice', 'alice/pub.wav',  100, 30);

insert into generation_jobs (user_id, prompt, status, credits_cost)
values (:'alice', 'alice job', 'queued', 5);

-- ===========================================================================
-- As Bob, a signed-in user who owns none of the above.
-- ===========================================================================
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
declare v_count int; v_failed boolean;
begin
  raise notice 'A. another user''s private song is invisible';
  select count(*) into v_count from songs
    where id = '33333333-3333-3333-3333-333333333333';
  if v_count <> 0 then raise exception 'FAIL: private song leaked (% rows)', v_count; end if;

  raise notice 'B. a public song is readable';
  select count(*) into v_count from songs
    where id = '44444444-4444-4444-4444-444444444444';
  if v_count <> 1 then raise exception 'FAIL: public song not readable'; end if;

  raise notice 'C. audio assets follow their song''s visibility';
  select count(*) into v_count from audio_assets
    where storage_path = 'alice/priv.wav';
  if v_count <> 0 then raise exception 'FAIL: private audio asset leaked'; end if;
  select count(*) into v_count from audio_assets
    where storage_path = 'alice/pub.wav';
  if v_count <> 1 then raise exception 'FAIL: public audio asset hidden'; end if;

  raise notice 'D. another user''s profile row is invisible';
  select count(*) into v_count from profiles
    where id = '11111111-1111-1111-1111-111111111111';
  if v_count <> 0 then raise exception 'FAIL: another profile is readable'; end if;

  raise notice 'E. another user''s credit ledger is invisible';
  select count(*) into v_count from credit_ledger
    where user_id = '11111111-1111-1111-1111-111111111111';
  if v_count <> 0 then raise exception 'FAIL: another ledger leaked'; end if;

  raise notice 'F. another user''s generation jobs are invisible';
  select count(*) into v_count from generation_jobs
    where user_id = '11111111-1111-1111-1111-111111111111';
  if v_count <> 0 then raise exception 'FAIL: another user''s jobs leaked'; end if;

  raise notice 'G. a song cannot be fabricated by a client';
  v_failed := false;
  begin
    insert into songs (user_id, title, prompt, duration_seconds)
    values ('22222222-2222-2222-2222-222222222222', 'Forged', 'forged', 30);
  exception when insufficient_privilege then
    v_failed := true;
  end;
  if not v_failed then
    raise exception 'FAIL: a client inserted a song directly';
  end if;

  raise notice 'H. another user''s song cannot be edited';
  update songs set title = 'Hijacked'
    where id = '44444444-4444-4444-4444-444444444444';
  if found then raise exception 'FAIL: updated a song owned by someone else'; end if;

  raise notice 'I. credits cannot be raised even through the owner''s own row';
  v_failed := false;
  begin
    update profiles set credit_balance = 99999
      where id = '22222222-2222-2222-2222-222222222222';
  exception when check_violation then
    v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL: self-granted credits'; end if;

  raise notice 'J. privileged functions are not callable from the browser role';
  v_failed := false;
  begin
    perform apply_credit_delta('22222222-2222-2222-2222-222222222222', 1000,
                               'hack', null, null, 'hack:1');
  exception when insufficient_privilege then
    v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL: apply_credit_delta was callable'; end if;

  v_failed := false;
  begin
    perform set_user_plan('22222222-2222-2222-2222-222222222222', 'premier');
  exception when insufficient_privilege then
    v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL: set_user_plan was callable'; end if;

  v_failed := false;
  begin
    perform complete_generation_job(gen_random_uuid(), 'Forged', 30, 'p', 1, 'wav', null, 'x');
  exception when insufficient_privilege then
    v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL: complete_generation_job was callable'; end if;

  raise notice 'K. a user cannot refresh someone else''s daily credits';
  v_failed := false;
  begin
    perform grant_daily_credits('11111111-1111-1111-1111-111111111111');
  exception when sqlstate '28000' then
    v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL: refreshed another user''s credits'; end if;

  raise notice 'BOB SEES ONLY WHAT HE SHOULD';
end;
$$;

-- ===========================================================================
-- As Alice, who owns the songs.
-- ===========================================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare v_failed boolean;
begin
  raise notice 'P. an owner may rename their own song';
  update songs set title = 'Renamed By Owner'
   where id = '33333333-3333-3333-3333-333333333333';
  if not found then raise exception 'FAIL: owner could not rename their song'; end if;

  raise notice 'Q. an owner cannot grant themselves commercial rights';
  -- commercial_use comes from the plan at generation time. Without a guard the
  -- songs UPDATE policy let an owner simply set it to true.
  v_failed := false;
  begin
    update songs set commercial_use = true
     where id = '33333333-3333-3333-3333-333333333333';
  exception when check_violation then
    v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL: self-granted commercial rights'; end if;

  raise notice 'R. an owner cannot inflate their own counters';
  v_failed := false;
  begin
    update songs set play_count = 999999
     where id = '33333333-3333-3333-3333-333333333333';
  exception when check_violation then
    v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL: play_count was writable'; end if;

  v_failed := false;
  begin
    update songs set like_count = 999999
     where id = '33333333-3333-3333-3333-333333333333';
  exception when check_violation then
    v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL: like_count was writable'; end if;

  raise notice 'S. a song cannot be handed to another user';
  v_failed := false;
  begin
    update songs set user_id = '22222222-2222-2222-2222-222222222222'
     where id = '33333333-3333-3333-3333-333333333333';
  exception when check_violation then
    v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL: song ownership was transferable'; end if;

  raise notice 'OWNER WRITES ARE CONFINED TO EDITABLE COLUMNS';
end;
$$;

-- ===========================================================================
-- As an anonymous visitor.
-- ===========================================================================
reset role;
set local role anon;
set local "request.jwt.claims" = '';

do $$
declare v_count int;
begin
  raise notice 'L. anonymous visitors can read a shared song';
  select count(*) into v_count from songs
    where id = '44444444-4444-4444-4444-444444444444';
  if v_count <> 1 then raise exception 'FAIL: public song not readable anonymously'; end if;

  raise notice 'M. anonymous visitors cannot read a private song';
  select count(*) into v_count from songs
    where id = '33333333-3333-3333-3333-333333333333';
  if v_count <> 0 then raise exception 'FAIL: private song readable anonymously'; end if;

  raise notice 'N. anonymous visitors see no profiles, ledgers or jobs';
  select count(*) into v_count from profiles;
  if v_count <> 0 then raise exception 'FAIL: profiles readable anonymously'; end if;
  select count(*) into v_count from credit_ledger;
  if v_count <> 0 then raise exception 'FAIL: ledger readable anonymously'; end if;
  select count(*) into v_count from generation_jobs;
  if v_count <> 0 then raise exception 'FAIL: jobs readable anonymously'; end if;

  raise notice 'O. the public profile view exposes names but not credits';
  select count(*) into v_count from public_profiles
    where id = '11111111-1111-1111-1111-111111111111';
  if v_count <> 1 then raise exception 'FAIL: public_profiles is not readable'; end if;

  raise notice 'ALL RLS CHECKS HELD';
end;
$$;

reset role;
rollback;
