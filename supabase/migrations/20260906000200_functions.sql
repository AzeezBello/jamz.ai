-- Privileged operations. Clients never UPDATE credits, plans, or job state
-- directly; they call these functions, which run as the definer and enforce
-- the invariants the browser cannot be trusted with.

-- ---------------------------------------------------------------------------
-- Guard: profiles.credit_balance / plan_id / stripe_customer_id may only be
-- written from inside the credit + billing functions below, which set a
-- transaction-local flag first. This holds even against a leaked service key
-- used to issue a naive UPDATE.
-- ---------------------------------------------------------------------------

create or replace function guard_privileged_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.privileged_write', true) = 'on' then
    return new;
  end if;

  if new.credit_balance is distinct from old.credit_balance then
    raise exception 'credit_balance may only be changed through the credit ledger'
      using errcode = 'check_violation';
  end if;
  if new.plan_id is distinct from old.plan_id then
    raise exception 'plan_id may only be changed through billing functions'
      using errcode = 'check_violation';
  end if;
  if new.stripe_customer_id is distinct from old.stripe_customer_id then
    raise exception 'stripe_customer_id may only be changed through billing functions'
      using errcode = 'check_violation';
  end if;
  if new.daily_granted_on is distinct from old.daily_granted_on then
    raise exception 'daily_granted_on may only be changed through credit functions'
      using errcode = 'check_violation';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_guard_privileged
  before update on profiles
  for each row execute function guard_privileged_profile_columns();

-- ---------------------------------------------------------------------------
-- New auth user -> profile, seeded with the free plan's daily allowance.
-- ---------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_daily int;
begin
  v_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(new.email, '@', 1)
  );

  select daily_credits into v_daily from plans where id = 'free';

  perform set_config('app.privileged_write', 'on', true);

  insert into profiles (id, display_name, avatar_url, credit_balance, daily_granted_on)
  values (
    new.id,
    v_name,
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    coalesce(v_daily, 0),
    current_date
  )
  on conflict (id) do nothing;

  insert into credit_ledger (user_id, delta, balance_after, reason, idempotency_key)
  values (new.id, coalesce(v_daily, 0), coalesce(v_daily, 0), 'signup_grant', 'signup:' || new.id::text)
  on conflict (idempotency_key) do nothing;

  perform set_config('app.privileged_write', 'off', true);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- The single writer for credit_balance.
--
-- Idempotent on p_idempotency_key: a replayed call returns the balance the
-- original produced and moves nothing. Debits that would go negative raise
-- `insufficient_credits` rather than silently clamping.
-- ---------------------------------------------------------------------------

create or replace function apply_credit_delta(
  p_user_id         uuid,
  p_delta           int,
  p_reason          text,
  p_ref_type        text default null,
  p_ref_id          uuid default null,
  p_idempotency_key text default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
  v_new     int;
  v_existing int;
begin
  if p_idempotency_key is not null then
    select balance_after into v_existing
      from credit_ledger where idempotency_key = p_idempotency_key;
    if found then
      return v_existing;
    end if;
  end if;

  -- Serialise concurrent debits for this user.
  select credit_balance into v_balance
    from profiles where id = p_user_id for update;

  if not found then
    raise exception 'profile % not found', p_user_id using errcode = 'no_data_found';
  end if;

  v_new := v_balance + p_delta;

  if v_new < 0 then
    raise exception 'insufficient_credits: balance % cannot cover %', v_balance, p_delta
      using errcode = 'check_violation';
  end if;

  perform set_config('app.privileged_write', 'on', true);
  update profiles set credit_balance = v_new, updated_at = now() where id = p_user_id;
  perform set_config('app.privileged_write', 'off', true);

  insert into credit_ledger (user_id, delta, balance_after, reason, ref_type, ref_id, idempotency_key)
  values (p_user_id, p_delta, v_new, p_reason, p_ref_type, p_ref_id, p_idempotency_key);

  return v_new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Daily top-up for plans with a daily allowance.
--
-- Tops the balance *up to* the allowance rather than adding to it, and only
-- once per calendar day. Returns the balance in force after the check.
-- ---------------------------------------------------------------------------

create or replace function grant_daily_credits(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan       text;
  v_daily      int;
  v_balance    int;
  v_granted_on date;
  v_topup      int;
begin
  -- Signed-in callers may only refresh their own allowance. A null auth.uid()
  -- means service_role (the Stripe webhook), which may act for anyone.
  if auth.uid() is not null and p_user_id <> auth.uid() then
    raise exception 'not_authenticated: you may only refresh your own credits'
      using errcode = '28000';
  end if;

  select p.plan_id, pl.daily_credits, p.credit_balance, p.daily_granted_on
    into v_plan, v_daily, v_balance, v_granted_on
    from profiles p join plans pl on pl.id = p.plan_id
   where p.id = p_user_id
     for update of p;

  if not found then
    raise exception 'profile % not found', p_user_id using errcode = 'no_data_found';
  end if;

  if v_daily is null then
    return v_balance;                       -- paid plans grant per billing period
  end if;

  if v_granted_on is not null and v_granted_on >= current_date then
    return v_balance;                       -- already topped up today
  end if;

  v_topup := greatest(v_daily - v_balance, 0);

  perform set_config('app.privileged_write', 'on', true);
  update profiles set daily_granted_on = current_date, updated_at = now() where id = p_user_id;
  perform set_config('app.privileged_write', 'off', true);

  if v_topup > 0 then
    return apply_credit_delta(
      p_user_id, v_topup, 'daily_grant', 'plan', null,
      'daily:' || p_user_id::text || ':' || current_date::text
    );
  end if;

  return v_balance;
end;
$$;

-- Billing-period grant for paid plans. Called by the Stripe webhook.
create or replace function grant_plan_credits(
  p_user_id uuid,
  p_idempotency_key text
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_monthly int;
  v_balance int;
  v_topup   int;
begin
  select pl.monthly_credits, p.credit_balance
    into v_monthly, v_balance
    from profiles p join plans pl on pl.id = p.plan_id
   where p.id = p_user_id
     for update of p;

  if v_monthly is null then
    return v_balance;
  end if;

  v_topup := greatest(v_monthly - v_balance, 0);
  if v_topup = 0 then
    return v_balance;
  end if;

  return apply_credit_delta(p_user_id, v_topup, 'plan_grant', 'plan', null, p_idempotency_key);
end;
$$;

-- Plan changes come from Stripe only; this is the sole writer of plan_id.
create or replace function set_user_plan(p_user_id uuid, p_plan_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.privileged_write', 'on', true);
  update profiles set plan_id = p_plan_id, updated_at = now() where id = p_user_id;
  perform set_config('app.privileged_write', 'off', true);
end;
$$;

create or replace function set_stripe_customer(p_user_id uuid, p_customer_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.privileged_write', 'on', true);
  update profiles set stripe_customer_id = p_customer_id, updated_at = now() where id = p_user_id;
  perform set_config('app.privileged_write', 'off', true);
end;
$$;
