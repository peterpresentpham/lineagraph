#!/usr/bin/env bash
# Saves the site's content (schemas kg and history: people, polities, events, relations, sources,
# vocabularies) to a compressed SQL file. Admin accounts and the change log are left out.
#
#   DATABASE_URL=postgres://... scripts/db-export.sh [output-file]
#
# The file is data only: restore it into a database that has been migrated (`pnpm db:migrate`) but
# not seeded, with scripts/db-import.sh. Needs pg_dump (PostgreSQL client tools) of the same major
# version as the server or newer.
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to the database to export}"
out="${1:-data/snapshot-$(date +%Y%m%d-%H%M).sql.gz}"
mkdir -p "$(dirname "$out")"

pg_dump "$DATABASE_URL" \
  --data-only --no-owner --no-privileges \
  --schema=kg --schema=history \
  --exclude-table-data=kg.audit_log \
  | gzip -9 > "$out"

echo "Saved $out ($(du -h "$out" | cut -f1))"
