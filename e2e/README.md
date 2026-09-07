# End-to-end tests

These drive the real app against a real Supabase project. They are excluded
from `npm test` (unit tests) and run with `npm run test:e2e`.

## Prerequisites

1. **A Supabase stack.** Either `npm run db:start` (local) or a staging project.
2. **Migrations applied**: `npm run db:reset` (local) or `npm run db:push`.
3. **Edge functions served**: `npm run functions:serve` locally, or deployed.
4. **`.env` pointing at that stack** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
5. **Email confirmation off**, so sign-up yields a session without a mail
   round-trip. `npm run test:e2e:local` does this for you and restores the
   committed value on exit, including on failure or interrupt. Production keeps
   confirmations **on**.

## Running

```bash
npx playwright install chromium   # once
npm run test:e2e:local            # flips email confirmation, runs, restores
npm run test:e2e:local auth.spec  # a single file
```

`test:e2e:local` restarts the stack and handles the confirmation setting for
you. Use `npm run test:e2e` directly against a stack you have already prepared.

## Coverage

| Spec                   | What it protects                                                |
| ---------------------- | --------------------------------------------------------------- |
| `auth.spec.ts`         | Real credential checks, route guards, no data left after logout |
| `generation.spec.ts`   | Debit, job completion, real playback, real download             |
| `cancellation.spec.ts` | Cancel stops the job **and** refunds; background jobs survive   |
| `routing.spec.ts`      | Deep links, 404, private vs public visibility under RLS         |
| `billing.spec.ts`      | Yearly pricing is genuinely cheaper; checkout requires auth     |

The Stripe checkout test is skipped unless `STRIPE_TEST_MODE=1` and test-mode
price ids are configured.
