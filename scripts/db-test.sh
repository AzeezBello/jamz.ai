#!/usr/bin/env bash
# Run the database test suites against the local Supabase stack.
#
# Uses psql inside the postgres container, so no local psql install is needed.
# Each suite runs in a transaction and rolls back, leaving the database as it
# was found.
set -euo pipefail

CONTAINER="${SUPABASE_DB_CONTAINER:-$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)}"

if [ -z "$CONTAINER" ]; then
  echo "No supabase_db_* container is running. Start it with: npm run db:start" >&2
  exit 1
fi

status=0
for suite in supabase/tests/*.sql; do
  echo "── $suite"
  if docker exec -i "$CONTAINER" psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 < "$suite"; then
    echo "   passed"
  else
    echo "   FAILED" >&2
    status=1
  fi
done

exit "$status"
