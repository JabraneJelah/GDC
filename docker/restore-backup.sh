#!/bin/sh
# Manual rollback helper: restore a SQL dump created by pg_dump (not run automatically).
# Usage: restore-backup.sh /backups/backup_YYYY-MM-DD_HH-MM-SS.sql
# Requires DATABASE_URL (same as the app). Typical: docker compose exec app restore-backup /backups/...

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is required." >&2
  exit 1
fi

if [ -z "$1" ]; then
  echo "Usage: restore-backup <path-to-backup.sql>" >&2
  echo "Example: restore-backup /backups/backup_2026-04-20_12-00-00.sql" >&2
  exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

echo "restore-backup: restoring from $BACKUP_FILE (ON_ERROR_STOP=1)..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$BACKUP_FILE"
echo "restore-backup: finished."
