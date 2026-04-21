#!/bin/sh
# Production-safe container startup:
#   env → optional DB host check → DB TCP readiness → optional pg_dump backup →
#   pending migration SQL scan → migrate deploy → app.
# No db push, reset, or seed. Any step failure exits non-zero.
# Runs as nextjs; first invocation as root fixes /backups ownership then re-execs via su-exec.

set -e

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

log() {
  echo "[startup] $*"
}

# Ensure /backups exists and is writable by nextjs (named volumes are often root-owned).
if [ "$(id -u)" = 0 ]; then
  mkdir -p /backups
  chown -R nextjs:nodejs /backups 2>/dev/null || true
  exec su-exec nextjs "$0" "$@"
fi

cd /app

# --- 1) Required environment ---
[ -z "$NODE_ENV" ] && fail "NODE_ENV is required."
[ -z "$DATABASE_URL" ] && fail "DATABASE_URL is required."
[ -z "$JWT_SECRET" ] && fail "JWT_SECRET is required."

# --- 2) Production JWT safety ---
if [ "$NODE_ENV" = "production" ]; then
  node -e "
const s = process.env.JWT_SECRET;
const l = s.toLowerCase();
if (s.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters in production.');
  process.exit(1);
}
const forbidden = [
  'dev-secret', 'your-secret-key-change', 'changeme', 'password', '123456',
  'example-secret', 'secret-key-change', 'admin123', 'test-secret',
];
for (const p of forbidden) {
  if (l.includes(p)) {
    console.error('JWT_SECRET contains a forbidden or placeholder-like substring:', p);
    process.exit(1);
  }
}
process.exit(0);
  " || fail "JWT_SECRET failed production validation (see messages above)."
  log "JWT_SECRET passed production checks."
fi

# --- 3) Optional anti-wrong-DB: EXPECTED_DB_HOST must match DATABASE_URL hostname ---
if [ -n "$EXPECTED_DB_HOST" ]; then
  actual_host=$(node -e "console.log(new URL(process.env.DATABASE_URL).hostname)")
  if [ "$actual_host" != "$EXPECTED_DB_HOST" ]; then
    fail "DATABASE_URL host '$actual_host' does not match EXPECTED_DB_HOST='$EXPECTED_DB_HOST'."
  fi
  log "EXPECTED_DB_HOST check passed ($actual_host)."
fi

# --- 4) Database TCP readiness (retry) ---
log "Waiting for database (TCP)..."
i=0
while true; do
  if node -e "
const u = new URL(process.env.DATABASE_URL);
const net = require('net');
const port = u.port ? Number(u.port) : 5432;
const c = net.connect({ host: u.hostname, port });
c.setTimeout(5000);
c.on('connect', () => { c.destroy(); process.exit(0); });
c.on('timeout', () => { try { c.destroy(); } catch (e) {} process.exit(1); });
c.on('error', () => process.exit(1));
" 2>/dev/null; then
  log "Database is reachable."
  break
fi
i=$((i + 1))
if [ "$i" -ge 30 ]; then
  fail "Database not reachable after 30 attempts (2s apart, ~60s)."
fi
log "retry $i/30..."
sleep 2
done

# --- 5) Optional pre-migration backup (pg_dump) ---
auto_backup=$(printf '%s' "${AUTO_BACKUP_BEFORE_MIGRATE:-}" | tr '[:upper:]' '[:lower:]')
if [ "$auto_backup" = "true" ]; then
  log "database backup: starting (AUTO_BACKUP_BEFORE_MIGRATE=true, UTC timestamp)"
  BT="/backups/backup_$(date -u +%Y-%m-%d_%H-%M-%S).sql"
  if ! pg_dump "$DATABASE_URL" --no-owner --no-acl -f "$BT"; then
    echo "ERROR: pg_dump backup failed; not proceeding to migration or app." >&2
    exit 1
  fi
  log "database backup: success ($BT)"
fi

# --- 6) Pending migration SQL safety scan (before migrate deploy) ---
log "Scanning pending migration SQL for destructive patterns..."
node /app/docker/scan-pending-migrations.cjs || fail "Migration safety scan failed."

# --- 7) Migrations only ---
log "Running npx prisma migrate deploy..."
npx prisma migrate deploy || fail "prisma migrate deploy failed."

# --- 8) Application ---
log "Starting Next.js standalone (node server.js)..."
exec node server.js
