-- Onboarding state lives on the profile, not in localStorage, so the intro
-- does not reappear on a second device or after clearing site data — and so
-- "have they finished onboarding?" is answerable server-side.

alter table profiles
  add column if not exists onboarded_at      timestamptz,
  add column if not exists tour_completed_at timestamptz,
  -- Individual hints the user has dismissed, so each can be retired
  -- independently without a migration per tip.
  add column if not exists dismissed_tips    text[] not null default '{}';

-- These are ordinary preferences: the existing profiles_update_own policy
-- covers them, and the guard trigger deliberately does not, because unlike
-- credits and plan there is nothing to gain by lying about them.

comment on column profiles.onboarded_at is
  'When the first-run intro was completed or skipped. Null means show it.';
comment on column profiles.tour_completed_at is
  'When the guided product tour was finished or dismissed.';
comment on column profiles.dismissed_tips is
  'Ids of one-off hints the user has closed.';
