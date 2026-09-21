#!/usr/bin/env bash
# Prueba las migraciones y los permisos en un Postgres local descartable, sin
# Docker: crea una base temporal, aplica supabase/tests/stub_supabase.sql,
# todas las migraciones en orden y supabase/tests/rls_fase_1.sql, y la borra.
#
# Uso: bash scripts/probar-rls.sh
# Necesita los binarios de Postgres. Si no están en el PATH, indicar la carpeta:
#   PG_BIN="/c/Program Files/PostgreSQL/18/bin" bash scripts/probar-rls.sh
set -euo pipefail

raiz="$(cd "$(dirname "$0")/.." && pwd)"
pg_bin="${PG_BIN:-/c/Program Files/PostgreSQL/18/bin}"
puerto="${PG_PORT:-55432}"
datos="$(mktemp -d)"

limpiar() {
  "$pg_bin/pg_ctl" -D "$datos" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$datos"
}
trap limpiar EXIT

"$pg_bin/initdb" -D "$datos" -U postgres --auth=trust --encoding=UTF8 --locale=C >/dev/null
"$pg_bin/pg_ctl" -D "$datos" -o "-p $puerto -c listen_addresses=localhost" -l "$datos/log.txt" -w start >/dev/null

export PGCLIENTENCODING=UTF8
psql() { "$pg_bin/psql" -h localhost -p "$puerto" -U postgres -d postgres -X -q -v ON_ERROR_STOP=1 "$@"; }

psql -f "$raiz/supabase/tests/stub_supabase.sql" >/dev/null
for migracion in "$raiz"/supabase/migrations/*.sql; do
  echo "Aplicando $(basename "$migracion")"
  psql -f "$migracion" >/dev/null
done
psql -t -f "$raiz/supabase/tests/rls_fase_1.sql" 2>&1 | grep -v '^[[:space:]]*$' | sed 's/^psql:.*NOTICE:  //'
