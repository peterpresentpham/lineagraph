#!/usr/bin/env bash
# Loads a file made by scripts/db-export.sh into an empty, migrated database.
#
#   DATABASE_URL=postgres://... scripts/db-import.sh data/snapshot-....sql.gz
#
# Order for a new database: `pnpm db:migrate`, then this script, then `pnpm db:create-admin`.
# Do not run `pnpm db:seed` first: the vocabularies (relation types, office types...) are part of
# the snapshot. Everything is loaded in one transaction, so a failure leaves the database empty.
# It refuses to run when the database already holds records.
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to the database to load into}"
file="${1:?Usage: db-import.sh <snapshot.sql.gz>}"
[ -f "$file" ] || { echo "No such file: $file" >&2; exit 1; }

existing=$(psql "$DATABASE_URL" -tAc "select count(*) from kg.node")
if [ "$existing" != "0" ]; then
  echo "The database already holds $existing records; this script only loads into an empty one." >&2
  exit 1
fi

# Migration 0003 itself inserts a few relation types; the snapshot carries the full, current set,
# so they are cleared first (nothing can refer to them yet: the database holds no records).
{
  echo "truncate kg.relation_type cascade;"
  gunzip -c "$file"
} | psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction --quiet -o /dev/null
echo "Loaded $file. Records now: $(psql "$DATABASE_URL" -tAc "select count(*) from kg.node")"
