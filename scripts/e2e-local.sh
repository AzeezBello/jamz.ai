#!/usr/bin/env bash
# Run the browser end-to-end suite against the local Supabase stack.
#
# Signup in the specs must yield a session immediately, which means email
# confirmation has to be off. That is a test-only setting — production keeps
# confirmations on — so this flips it, runs, and restores the committed value
# even if the run fails or is interrupted.
#
#   npm run test:e2e:local            # whole suite
#   npm run test:e2e:local auth.spec  # one file
set -euo pipefail

CONFIG="supabase/config.toml"
BACKUP="$(mktemp)"
cp "$CONFIG" "$BACKUP"

restore() {
  cp "$BACKUP" "$CONFIG"
  rm -f "$BACKUP"
  echo "restored $CONFIG (email confirmation back on)"
}
trap restore EXIT INT TERM

python3 - "$CONFIG" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1])
s = p.read_text()
before = s
s = s.replace("enable_confirmations = true", "enable_confirmations = false")
assert s != before, "enable_confirmations = true not found in config.toml"
p.write_text(s)
PY
echo "email confirmation disabled for this run"

npx supabase stop --no-backup >/dev/null 2>&1 || true
npx supabase start -x logflare,vector,studio,imgproxy,mailpit,supavisor >/dev/null
echo "stack up"

npx playwright test "$@"
