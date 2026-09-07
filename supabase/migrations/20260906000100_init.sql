-- JAMZ core schema: identities, entitlements, credits, generation, catalogue.
-- Everything a client can reach is guarded by RLS; every privileged mutation
-- goes through a SECURITY DEFINER function so the browser is never the
-- source of truth for credits, plans, or job state.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type billing_interval as enum ('monthly', 'yearly');
create type subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'incomplete',
  'incomplete_expired', 'unpaid', 'paused'
);
create type job_status as enum ('queued', 'running', 'completed', 'failed', 'cancelled');
create type song_visibility as enum ('private', 'unlisted', 'public');
create type audio_kind as enum ('master', 'stem', 'upload', 'reference');
create type report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');

-- ---------------------------------------------------------------------------
-- Plans: the entitlement catalogue. Read-only to clients.
-- ---------------------------------------------------------------------------

create table plans (
  id                     text primary key,
  name                   text        not null,
  description            text        not null default '',
  sort_order             int         not null default 0,
  monthly_price_cents    int         not null default 0,
  yearly_price_cents     int         not null default 0,
  -- Free plans top up to `daily_credits` every calendar day; paid plans are
  -- granted `monthly_credits` at the start of each billing period.
  daily_credits          int,
  monthly_credits        int,
  commercial_use         boolean     not null default false,
  max_concurrent_jobs    int         not null default 1,
  max_upload_seconds     int         not null default 60,
  stem_count             int         not null default 0,
  stripe_monthly_price_id text,
  stripe_yearly_price_id  text,
  features               jsonb       not null default '[]'::jsonb,
  created_at             timestamptz not null default now()
);

insert into plans (id, name, description, sort_order, monthly_price_cents, yearly_price_cents,
                   daily_credits, monthly_credits, commercial_use, max_concurrent_jobs,
                   max_upload_seconds, stem_count, features) values
  ('free', 'Free Plan', 'Our starter plan.', 0, 0, 0,
   50, null, false, 1, 60, 0,
   '["Access to v4.5-all","50 credits renew daily (10 songs)","No commercial use","Standard features only","Upload up to 1 min of audio","Shared creation queue","No add-on credit purchases"]'::jsonb),
  ('pro', 'Pro Plan', 'Access to our best models and editing tools.', 1, 800, 7200,
   null, 2500, true, 10, 480, 12,
   '["Access to latest v5 model","2,500 credits (up to 500 songs)","Commercial use rights","Standard + Pro features","Split into 12 stems","Upload up to 8 min audio","Add vocals to existing songs","Early access to new features","Purchase add-on credits","Priority queue, 10 songs at once"]'::jsonb),
  ('premier', 'Premier Plan', 'Maximum credits and every feature unlocked.', 2, 2400, 21600,
   null, 10000, true, 10, 480, 12,
   '["Access to Jamz Studio","Access to latest v5 model","10,000 credits (up to 2,000 songs)","Commercial use rights","Standard + Pro features","Split into 12 stems","Upload up to 8 min audio","Add vocals to existing songs","Early access to new features","Purchase add-on credits","Priority queue, 10 songs at once"]'::jsonb);

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user. credit_balance and plan_id are privileged.
-- ---------------------------------------------------------------------------

create table profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  handle              citext unique,
  display_name        text        not null default '',
  avatar_url          text,
  bio                 text        not null default '',
  plan_id             text        not null default 'free' references plans(id),
  credit_balance      int         not null default 0 check (credit_balance >= 0),
  daily_granted_on    date,
  marketing_opt_in    boolean     not null default false,
  notify_on_complete  boolean     not null default true,
  stripe_customer_id  text unique,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create index profiles_plan_idx on profiles(plan_id);

-- ---------------------------------------------------------------------------
-- Subscriptions mirror Stripe. Only webhooks (service_role) write here.
-- ---------------------------------------------------------------------------

create table subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references profiles(id) on delete cascade,
  plan_id                text not null references plans(id),
  status                 subscription_status not null,
  interval               billing_interval not null,
  stripe_customer_id     text not null,
  stripe_subscription_id text not null unique,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  canceled_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index subscriptions_user_idx on subscriptions(user_id);

create table invoices (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references profiles(id) on delete cascade,
  stripe_invoice_id  text not null unique,
  amount_due_cents   int  not null,
  amount_paid_cents  int  not null,
  currency           text not null default 'usd',
  status             text not null,
  hosted_invoice_url text,
  invoice_pdf        text,
  period_start       timestamptz,
  period_end         timestamptz,
  created_at         timestamptz not null default now()
);

create index invoices_user_idx on invoices(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Credit ledger: append-only. profiles.credit_balance is a cached fold of it.
-- ---------------------------------------------------------------------------

create table credit_ledger (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  delta            int  not null,
  balance_after    int  not null check (balance_after >= 0),
  reason           text not null,
  ref_type         text,
  ref_id           uuid,
  -- Two writes with the same key collapse into one: this is what makes
  -- generation retries and Stripe webhook replays safe.
  idempotency_key  text unique,
  created_at       timestamptz not null default now()
);

create index credit_ledger_user_idx on credit_ledger(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Projects / songs / assets
-- ---------------------------------------------------------------------------

create table projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  title      text not null default 'Untitled project',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index projects_user_idx on projects(user_id, updated_at desc);

create table songs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  project_id       uuid references projects(id) on delete set null,
  title            text not null,
  prompt           text not null default '',
  style            text not null default '',
  lyrics           text,
  is_instrumental  boolean not null default false,
  duration_seconds int not null default 0,
  cover_url        text,
  visibility       song_visibility not null default 'private',
  play_count       int not null default 0,
  like_count       int not null default 0,
  commercial_use   boolean not null default false,
  model_version    text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index songs_user_idx      on songs(user_id, created_at desc) where deleted_at is null;
create index songs_public_idx    on songs(created_at desc) where visibility = 'public' and deleted_at is null;
create index songs_search_idx on songs using gin (to_tsvector('english', title || ' ' || prompt));

create table audio_assets (
  id               uuid primary key default gen_random_uuid(),
  song_id          uuid not null references songs(id) on delete cascade,
  user_id          uuid not null references profiles(id) on delete cascade,
  kind             audio_kind not null default 'master',
  label            text not null default '',
  format           text not null default 'wav',
  storage_path     text not null,
  bytes            bigint not null default 0,
  duration_seconds int not null default 0,
  created_at       timestamptz not null default now()
);

create index audio_assets_song_idx on audio_assets(song_id);

-- ---------------------------------------------------------------------------
-- Generation jobs: the durable unit of work.
-- ---------------------------------------------------------------------------

create table generation_jobs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  project_id       uuid references projects(id) on delete set null,
  song_id          uuid references songs(id) on delete set null,
  prompt           text not null,
  params           jsonb not null default '{}'::jsonb,
  status           job_status not null default 'queued',
  progress         int not null default 0 check (progress between 0 and 100),
  status_message   text not null default 'Queued',
  -- Cooperative cancellation: the worker checks this between stages.
  cancel_requested boolean not null default false,
  error_code       text,
  error_message    text,
  credits_cost     int not null default 0,
  refunded         boolean not null default false,
  idempotency_key  text unique,
  attempts         int not null default 0,
  provider         text not null default 'mock',
  worker_id        text,
  lease_expires_at timestamptz,
  queued_at        timestamptz not null default now(),
  started_at       timestamptz,
  finished_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index generation_jobs_user_idx   on generation_jobs(user_id, created_at desc);
create index generation_jobs_claim_idx  on generation_jobs(status, queued_at) where status in ('queued', 'running');

-- ---------------------------------------------------------------------------
-- Social
-- ---------------------------------------------------------------------------

create table likes (
  user_id    uuid not null references profiles(id) on delete cascade,
  song_id    uuid not null references songs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create index likes_song_idx on likes(song_id);

create table public_shares (
  id         uuid primary key default gen_random_uuid(),
  song_id    uuid not null references songs(id) on delete cascade,
  slug       text not null unique,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text not null default '',
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications(user_id, created_at desc);

create table reports (
  id          uuid primary key default gen_random_uuid(),
  song_id     uuid references songs(id) on delete set null,
  reporter_id uuid references profiles(id) on delete set null,
  reason      text not null,
  details     text not null default '',
  status      report_status not null default 'open',
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create table audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references profiles(id) on delete set null,
  action     text not null,
  target_type text,
  target_id  uuid,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_idx on audit_logs(actor_id, created_at desc);
