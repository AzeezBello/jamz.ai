-- Row level security. Deny by default, then open only what a signed-in user
-- legitimately owns plus the public catalogue.

alter table profiles        enable row level security;
alter table subscriptions   enable row level security;
alter table invoices        enable row level security;
alter table credit_ledger   enable row level security;
alter table projects        enable row level security;
alter table songs           enable row level security;
alter table audio_assets    enable row level security;
alter table generation_jobs enable row level security;
alter table likes           enable row level security;
alter table public_shares   enable row level security;
alter table notifications   enable row level security;
alter table reports         enable row level security;
alter table audit_logs      enable row level security;
alter table plans           enable row level security;

-- Plans are a public price list.
create policy plans_read on plans for select using (true);

-- Profiles: a user sees and edits only their own row, and the privileged
-- columns are additionally blocked by the guard trigger.
create policy profiles_select_own on profiles for select
  using (id = auth.uid());
create policy profiles_update_own on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Billing records are read-only to the user; only webhooks write them.
create policy subscriptions_select_own on subscriptions for select
  using (user_id = auth.uid());
create policy invoices_select_own on invoices for select
  using (user_id = auth.uid());
create policy credit_ledger_select_own on credit_ledger for select
  using (user_id = auth.uid());

create policy projects_all_own on projects for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Songs: owners see everything of theirs; everyone else sees non-private,
-- non-deleted songs. Unlisted songs are reachable by id but excluded from
-- feed queries, which filter on visibility = 'public'.
create policy songs_select_visible on songs for select
  using (
    deleted_at is null and (user_id = auth.uid() or visibility <> 'private')
  );
create policy songs_update_own on songs for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy songs_delete_own on songs for delete
  using (user_id = auth.uid());
-- Note: there is no INSERT policy. Songs are created only by
-- complete_generation_job(), so a client cannot fabricate one.

create policy audio_assets_select_visible on audio_assets for select
  using (
    exists (
      select 1 from songs s
       where s.id = audio_assets.song_id
         and s.deleted_at is null
         and (s.user_id = auth.uid() or s.visibility <> 'private')
    )
  );

-- Jobs are readable by their owner (this is what powers realtime progress),
-- and writable by nobody: transitions go through the functions.
create policy generation_jobs_select_own on generation_jobs for select
  using (user_id = auth.uid());

create policy likes_select on likes for select using (true);
create policy likes_write_own on likes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy public_shares_select on public_shares for select
  using (revoked_at is null or created_by = auth.uid());
create policy public_shares_write_own on public_shares for all
  using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy notifications_select_own on notifications for select
  using (user_id = auth.uid());
create policy notifications_update_own on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy reports_insert_any on reports for insert
  with check (reporter_id = auth.uid());
create policy reports_select_own on reports for select
  using (reporter_id = auth.uid());

-- audit_logs: no policies at all -> readable/writable only by service_role.

-- ---------------------------------------------------------------------------
-- Function grants. Anything a client must not call is revoked from the
-- browser-facing roles even though it is SECURITY DEFINER.
-- ---------------------------------------------------------------------------

do $$
declare
  v_fn text;
  v_privileged text[] := array[
    'apply_credit_delta(uuid,integer,text,text,uuid,text)',
    'grant_plan_credits(uuid,text)',
    'set_user_plan(uuid,text)',
    'set_stripe_customer(uuid,text)',
    'refund_generation_job(uuid,text)',
    'claim_generation_job(text,integer)',
    'report_job_progress(uuid,integer,text,integer)',
    'complete_generation_job(uuid,text,integer,text,bigint,text,text,text)',
    'fail_generation_job(uuid,text,text)',
    'finish_cancelled_job(uuid)',
    'reap_stalled_jobs()',
    'guard_privileged_profile_columns()',
    'handle_new_user()'
  ];
begin
  foreach v_fn in array v_privileged loop
    execute format('revoke all on function %s from public, anon, authenticated', v_fn);
    execute format('grant execute on function %s to service_role', v_fn);
  end loop;
end;
$$;

-- Client-callable RPCs.
grant execute on function enqueue_generation(text,jsonb,uuid,text)   to authenticated;
grant execute on function request_cancel_generation(uuid)            to authenticated;
grant execute on function grant_daily_credits(uuid)                  to authenticated;
grant execute on function record_play(uuid)                          to anon, authenticated;
grant execute on function toggle_like(uuid)                          to authenticated;
grant execute on function set_song_visibility(uuid,song_visibility)  to authenticated;
grant execute on function soft_delete_song(uuid)                     to authenticated;
grant execute on function mark_account_deleted()                     to authenticated;
grant execute on function mark_notifications_read(uuid[])            to authenticated;

grant select on public_profiles to anon, authenticated;

-- Realtime: the client subscribes to its own generation_jobs rows. RLS above
-- keeps the stream scoped to the owner.
alter publication supabase_realtime add table generation_jobs;
alter publication supabase_realtime add table notifications;
