-- Stripe delivers at-least-once. Recording every processed event id makes the
-- handler idempotent even when a delivery is retried after a timeout.
create table stripe_events (
  id           text primary key,
  type         text not null,
  processed_at timestamptz not null default now(),
  payload      jsonb
);

alter table stripe_events enable row level security;
-- No policies: service_role only.
