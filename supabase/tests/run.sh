#!/usr/bin/env bash
# Applies every migration to a scratch database and runs the rule checks.
#   supabase/tests/run.sh "psql -h <host> -p <port> -U <user>"
# The database must be disposable: it is dropped and recreated.
set -euo pipefail
cd "$(dirname "$0")/../.."
read -r -a PSQL <<< "${1:-psql}"
DB=deshride_test
"${PSQL[@]}" -X -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
P=("${PSQL[@]}" -X -v ON_ERROR_STOP=1 -d "$DB")
"${P[@]}" -q -f supabase/tests/00_local_bootstrap.sql
# The one-paste setup file must match the migrations it is built from.
if ! cmp -s <(scripts/build-setup-sql.sh --stdout) supabase/setup-all.sql; then
  echo "supabase/setup-all.sql is out of date: run scripts/build-setup-sql.sh"
  exit 1
fi
# Apply it twice: pasting it into SQL Editor a second time must not fail.
"${P[@]}" -q -f supabase/setup-all.sql >/dev/null
"${P[@]}" -q -f supabase/setup-all.sql >/dev/null
echo "setup-all.sql applied (twice)"
"${P[@]}" -Atq -v content="$(cat src/test/fixtures/guard-cases.json)" <<'SQL'
select case when count(*) = 0 then 'GUARD PARITY OK' else 'GUARD PARITY FAILED: ' || string_agg(c->>'text', ' | ') end
from (select jsonb_array_elements(:'content'::jsonb) c) cases
where app.guard_message(c->>'text', coalesce(array(select jsonb_array_elements_text(c->'history')), '{}'))
  <> jsonb_build_object('text', c->>'out', 'flags', c->'flags');
SQL
"${P[@]}" -Atq -f supabase/tests/01_rules.sql | tail -1
bash supabase/tests/02_concurrency.sh "${P[@]}"
