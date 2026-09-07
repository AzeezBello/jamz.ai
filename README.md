# Jamz

AI music generation as a subscription product: describe a song, the server
generates and stores it, and you own a library you can play, share, download
and pay for.

The frontend is React + Vite + Tailwind + shadcn/ui. Everything that matters —
identity, credits, generation jobs, audio files, entitlements — lives on
Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) with Stripe for
billing. **The browser store is a cache of server state, never the source of
truth.**

---

## Quick start

```bash
npm install
cp .env.example .env          # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run db:start              # local Supabase (Docker)
npm run db:reset              # apply migrations + seed plans
npm run functions:serve       # edge functions on :54321
npm run dev                   # app on :5173
```

Without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` the app renders a
setup page instead of starting. That is deliberate: there is no browser-only
demo mode that could be mistaken for the real product.

---

## Architecture

```
Browser (React)
  │  supabase-js  ── RLS-scoped reads, SECURITY DEFINER RPCs
  │  fetch        ── edge functions for anything privileged
  ▼
Supabase
  ├─ Postgres     profiles · plans · subscriptions · invoices · credit_ledger
  │               projects · songs · audio_assets · generation_jobs · likes
  │               public_shares · notifications · reports · audit_logs
  ├─ Auth         email+password with confirmation, reset, OAuth-ready
  ├─ Storage      audio (private, signed URLs) · covers (public) · uploads
  ├─ Realtime     generation_jobs progress, notifications
  └─ Functions    generate · worker · download-url · delete-account
                  stripe-checkout · stripe-portal · stripe-webhook
                                                        │
                                                     Stripe
```

### Where the invariants live

| Invariant                                   | Enforced by                                                    |
| ------------------------------------------- | -------------------------------------------------------------- |
| You cannot give yourself credits            | `profiles_guard_privileged` trigger + `apply_credit_delta()`     |
| You cannot change your own plan             | Same trigger; only `set_user_plan()` (webhook) writes `plan_id`  |
| A generation is paid for exactly once       | Debit and job insert share one transaction; unique ledger key    |
| A cancelled or failed job is refunded once  | `refund_generation_job()` + unique `refund:<job>` ledger key      |
| Songs cannot be fabricated by a client      | No INSERT policy on `songs`; only `complete_generation_job()`     |
| Private songs stay private                  | RLS on `songs` / `audio_assets`; audio bucket is private          |
| Stripe replays do not double-grant credits  | `stripe_events` dedupe table + invoice-keyed grants               |

### Credits

Free plans **top up to** their daily allowance (they do not accumulate); paid
plans are granted their allowance at each billing period from the invoice
webhook. Every movement is a row in `credit_ledger`, and
`profiles.credit_balance` is a cached fold of it — the billing page audits the
two against each other and warns if they disagree.

A generation costs 5 credits (`generation_cost()` in SQL, `GENERATION_COST` in
`src/lib/credits.ts` — keep them in step).

### Generation jobs

`enqueue_generation()` debits and enqueues atomically. The `worker` function
claims jobs under a lease, writes progress into the row (the client watches it
over Realtime, with polling as a floor), and checks `cancel_requested` between
stages. Terminal states are `completed`, `failed`, `cancelled`; the last two
refund. Jobs whose worker dies are requeued by `reap_stalled_jobs()` and fail
after three attempts.

Cancelling is a server operation. Closing the modal does not cancel — it puts
the job in the background, where it finishes into your library.

### Audio

`GENERATION_PROVIDER=mock` (the default) renders a real, deterministic WAV in
`supabase/functions/_shared/synth.ts`, so playback, seeking, storage and
download work end to end with no third-party account. Point at a hosted model
by implementing `GenerationProvider` — a Replicate adapter is included:

```bash
supabase secrets set GENERATION_PROVIDER=replicate \
  REPLICATE_API_TOKEN=... REPLICATE_MODEL_VERSION=...
```

Masters live in a private bucket and are only ever handed out as 5-minute
signed URLs by the `download-url` function.

---

## Deploying

### 1. Database and functions

```bash
supabase link --project-ref <ref>
npm run db:push
npm run functions:deploy
```

### 2. Function secrets

```bash
supabase secrets set \
  SITE_URL=https://your-app.example \
  ALLOWED_ORIGINS=https://your-app.example \
  GENERATION_PROVIDER=mock \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_PRICE_PRO_MONTHLY=price_... \
  STRIPE_PRICE_PRO_YEARLY=price_... \
  STRIPE_PRICE_PREMIER_MONTHLY=price_... \
  STRIPE_PRICE_PREMIER_YEARLY=price_...
```

Price ids can instead be stored on the `plans` rows, which takes precedence.

### 3. Stripe

Create one product per paid plan with a monthly and a yearly price. Yearly
prices are full-year totals — the UI divides by twelve and shows the real
saving, so `yearly_price_cents` must actually be below `12 × monthly`.

Add a webhook to `https://<ref>.functions.supabase.co/stripe-webhook` for:

```
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

`stripe-webhook` is the only endpoint with `verify_jwt = false`; it
authenticates with the Stripe signature instead.

### 4. Auth

In the Supabase dashboard set the site URL and add `<site>/auth/callback` and
`<site>/reset-password` as redirect URLs. Keep email confirmation **on**.

### 5. Frontend

Any static host. The app uses client-side routing, so all paths must rewrite to
`index.html` — `vercel.json` and `public/_redirects` are included for Vercel
and Netlify.

### 6. Scheduled sweep (recommended)

`reap_stalled_jobs()` requeues jobs whose worker died. Run it every minute with
`pg_cron`, and poke the worker so queued jobs drain even if `generate` failed
to wake it:

```sql
select cron.schedule('reap-jobs', '* * * * *', $$select reap_stalled_jobs()$$);
```

---

## Scripts

| Command                 | What it does                                    |
| ----------------------- | ----------------------------------------------- |
| `npm run dev`           | Vite dev server                                 |
| `npm run build`         | Typecheck and build for production              |
| `npm run typecheck`     | `tsc -b` only                                   |
| `npm run lint`          | ESLint (`lint:fix` to autofix)                  |
| `npm run format`        | Prettier (`format:check` in CI)                 |
| `npm test`              | Vitest unit tests                               |
| `npm run test:e2e`      | Playwright end-to-end tests (see `e2e/README.md`) |
| `npm run verify`        | typecheck + lint + unit tests                   |
| `npm run db:start`      | Local Supabase stack                            |
| `npm run db:reset`      | Recreate the local database from migrations     |
| `npm run db:push`       | Push migrations to the linked project           |
| `npm run db:test`       | Database invariant + RLS suites                 |
| `npm run functions:*`   | Serve / deploy edge functions                   |

---

## Testing

Three layers:

**Unit** (`npm test`, no services needed) — credit accounting, job state
transitions, the WAV encoder and formatting helpers.

**Database** (`npm run db:test`, needs `npm run db:start`) — two suites in
`supabase/tests/`, each wrapped in a transaction that rolls back:

- `invariants.sql` runs as `postgres` and covers what triggers and functions
  enforce: the signup grant, credits being unwritable outside the ledger,
  idempotent debits, refused overdrafts, top-up-not-accumulate daily grants,
  charge-and-refund-exactly-once around cancellation, cooperative cancellation
  of a running job, per-plan concurrency, and completion keeping the charge.
- `rls.sql` switches to the `authenticated` and `anon` roles the browser
  actually uses, and covers what policies enforce: private songs and their
  audio invisible to other users and to anonymous visitors, profiles/ledgers/
  jobs scoped to their owner, songs uninsertable and uneditable by clients,
  self-granted credits rejected, and privileged functions not callable.

Both suites have been checked against deliberately broken schemas (guard
trigger disabled, RLS disabled) to confirm they fail when they should.

**End-to-end** (`npm run test:e2e`) — signup, generation, cancellation with
refund, playback, download, billing and logout. Needs a running stack plus
edge functions; see `e2e/README.md`.

---

## Repository layout

```
src/
  lib/          supabase client, API layer, credit + job rules, formatting
  store/        zustand caches: auth, library, player, generation
  pages/        routed pages
  sections/     landing-page sections
  components/   shared UI (ui/ is shadcn, generated — not linted or formatted)
supabase/
  migrations/   schema, functions, RLS, storage
  functions/    edge functions and their shared modules
e2e/            Playwright specs
```

---

## Known gaps

`record_play()` is callable by anonymous visitors and is not rate limited, so
public play counts are inflatable. Counting them per viewer (or dropping
anonymous plays) needs a `song_plays` table; it is not wired up yet.

Delivered here is the P0 production foundation plus Stripe. Still outstanding:
stems and remixing, cover-art generation, MP3 transcoding (masters are WAV),
projects/versioning UI, creator profiles and discovery beyond the public feed,
admin moderation tooling, the takedown workflow, and the legal pages
(`VITE_TERMS_URL` and friends are configuration hooks, not content).
