# End-to-end tests

These drive the real app against a real Supabase project. They are excluded
from `npm test` (unit tests) and run with `npm run test:e2e`.

## Prerequisites

1. **A Supabase stack.** Either `npm run db:start` (local) or a staging project.
2. **Migrations applied**: `npm run db:reset` (local) or `npm run db:push`.
3. **Edge functions served**: `npm run functions:serve` locally, or deployed.
4. **`.env` pointing at that stack** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
5. **Email confirmation off**, so sign-up yields a session without a mail
   round-trip. In `supabase/config.toml` set:

   ```toml
   [auth.email]
   enable_confirmations = false
   ```

   Keep this **on** in production — it is off only for the test stack.

## Running

```bash
npx playwright install --with-deps chromium   # once
npm run test:e2e
npm run test:e2e:ui                           # interactive
```

## Coverage

| Spec                  | What it protects                                              |
| --------------------- | ------------------------------------------------------------- |
| `auth.spec.ts`        | Real credential checks, route guards, no data left after logout |
| `generation.spec.ts`  | Debit, job completion, real playback, real download            |
| `cancellation.spec.ts`| Cancel stops the job **and** refunds; background jobs survive  |
| `routing.spec.ts`     | Deep links, 404, private vs public visibility under RLS        |
| `billing.spec.ts`     | Yearly pricing is genuinely cheaper; checkout requires auth    |

The Stripe checkout test is skipped unless `STRIPE_TEST_MODE=1` and test-mode
price ids are configured.
