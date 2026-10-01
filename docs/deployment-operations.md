# Deployment and operations

Verified from `Dockerfile`, `docker-compose.yml`, `docker/entrypoint.sh`, `docker/scan-pending-migrations.cjs`, `docker/restore-backup.sh`, Prisma configuration, and package scripts. Re-verified line-by-line against `Dockerfile` and `docker/entrypoint.sh` at commit `3ba4298` on 2026-09-30; no discrepancies found. The `3ba4298` release introduced no Docker, entrypoint, migration, or environment-variable changes.

## Build image

The Dockerfile uses Node 20 Alpine stages:

1. **base**: installs `libc6-compat`, sets `/app`.
2. **deps**: copies package manifests and runs `npm ci`.
3. **builder**:
   - copies dependencies and repository;
   - sets a dummy build-only `DATABASE_URL`;
   - runs `npx prisma generate --schema=prisma/schema.prisma`;
   - disables Next telemetry;
   - runs `npm run build`;
   - prunes dev dependencies.
4. **runner**:
   - installs PostgreSQL client and `su-exec`;
   - creates `nextjs` UID 1001 and `nodejs` GID 1001;
   - copies standalone output, static files, public files, Prisma schema/migrations/config, and pruned node modules;
   - installs entrypoint, scanner, and restore helper;
   - starts as root so volume ownership can be corrected.

The production process ultimately runs as `nextjs` and listens on port 3000 with `HOSTNAME=0.0.0.0`.

## Docker Compose topology

`postgres`:

- image `postgres:16-alpine`;
- container `conge_postgres`;
- database/user/password hard-coded for the supplied environment;
- host port 5433 → container 5432;
- `postgres_data` volume;
- `pg_isready` health check.

`app`:

- builds the repository Dockerfile;
- container `conge_app`;
- host port 3001 → container 3000;
- connects to host `postgres` inside the Compose network;
- waits for PostgreSQL health;
- supplies a local Compose JWT secret and production `NODE_ENV`;
- sets `EXPECTED_DB_HOST=postgres`;
- mounts `uploads_data` and `backups_data`.

These embedded credentials are convenient defaults, not a general production secret-management design.

## Actual startup sequence

`docker/entrypoint.sh` uses `set -e`. A failed required step exits the container.

1. When root, ensure `/backups` exists, recursively attempt to chown it to `nextjs:nodejs`, and re-exec with `su-exec`.
2. Change directory to `/app`.
3. Require `NODE_ENV`, `DATABASE_URL`, and `JWT_SECRET`.
4. In production, require JWT length ≥ 32 and reject a fixed list of placeholder-like substrings.
5. If `EXPECTED_DB_HOST` is set, parse `DATABASE_URL` and require an exact hostname match.
6. Test database TCP reachability up to 30 times, two seconds apart.
7. If `AUTO_BACKUP_BEFORE_MIGRATE=true`, create a SQL dump.
8. Run the pending migration SQL scanner.
9. Run `npx prisma migrate deploy`.
10. Replace the shell with `node server.js`.

Startup does not run seed, `db push`, `migrate reset`, or application bootstrap endpoints.

## Prisma deployment

`prisma migrate deploy` applies migration directories not recorded as successfully finished in `_prisma_migrations`. It does not compare the live schema semantically with `schema.prisma`, generate migrations, or repair out-of-band DDL.

The runtime image includes the Prisma CLI and migration files specifically for this startup action.

Before relying on deploy in production:

- inspect pending `migration.sql` directly;
- inspect the live `_prisma_migrations` state;
- account for any raw DDL previously run through legacy endpoints or manual operations;
- ensure the backup/restore plan matches the exact target database.

## Optional pre-migration backup

Set:

```env
AUTO_BACKUP_BEFORE_MIGRATE=true
```

The entrypoint runs:

```text
pg_dump DATABASE_URL --no-owner --no-acl -f /backups/backup_UTC_TIMESTAMP.sql
```

Characteristics:

- disabled by default;
- full logical SQL dump;
- failure blocks migration and application startup;
- stored in the `backups_data` named volume under supplied Compose;
- no automatic retention, pruning, encryption, off-host copy, checksum, or restore test;
- backup occurs before the migration scan, so a blocked deployment can still leave a useful pre-attempt dump.

## Expected database host guard

When `EXPECTED_DB_HOST` is non-empty, startup parses `DATABASE_URL` with Node’s URL parser and requires its hostname to equal the configured value exactly. This reduces accidental connection to the wrong host but does not verify database name, user, cluster identity, environment, or data contents.

## Destructive migration scanner

`docker/scan-pending-migrations.cjs` connects to PostgreSQL, loads successfully finished migration names, and scans local pending migration SQL after stripping comments.

Detected patterns:

- `DROP TABLE`
- `DROP COLUMN`
- `TRUNCATE`
- `DROP SCHEMA`
- `DROP DATABASE`
- `CREATE TABLE ... AS SELECT`
- `ALTER COLUMN ... TYPE`
- `DELETE FROM` without `WHERE` in the same semicolon-delimited segment
- obvious drop/recreate of the same table in one migration

This is regular-expression/pattern scanning, not SQL parsing or semantic migration analysis. It does not detect every destructive or blocking operation. Examples outside its guarantees include incorrect backfills, unsafe `SET NOT NULL`, constraint changes, data overwrites, enum problems, locking, case/collation changes, or application incompatibility.

### Fresh-database bypass

If `_prisma_migrations` is absent or has zero finished migrations, the scanner warns and exits successfully without scanning. This allows a fresh database to replay the entire historical migration chain.

The repository’s history contains destructive migrations. Therefore a successful fresh bootstrap is not evidence that historical operations were safe for prior data; a fresh database has no prior application data to preserve.

### Override

Setting:

```env
ALLOW_DESTRUCTIVE_MIGRATIONS=true
```

prints a warning and allows `migrate deploy` after detected destructive patterns. It is a full override, not approval of individual statements. It should only be used with explicit impact analysis, verified backup, and recovery plan.

## Restore helper and limitations

Manual command in the app container:

```text
restore-backup /backups/backup_YYYY-MM-DD_HH-MM-SS.sql
```

The script:

- requires `DATABASE_URL`;
- requires an existing file path;
- runs `psql DATABASE_URL -v ON_ERROR_STOP=1 -f FILE`.

It does **not**:

- create a new database;
- drop or clean existing objects;
- terminate other sessions;
- wrap the entire restore in a guaranteed transaction;
- verify the dump belongs to the target;
- restore roles/ownership omitted by `pg_dump` flags;
- automatically roll back a failed migration;
- test application compatibility after restore.

Restoring into a non-empty or partially migrated database can conflict with existing objects and data. A production runbook must define target preparation and validation.

## Persistent data

| Data | Container path | Supplied Compose persistence |
|---|---|---|
| PostgreSQL cluster | `/var/lib/postgresql/data` | `postgres_data` |
| Uploaded/generated documents | `/app/public/uploads` | `uploads_data` |
| SQL backups | `/backups` | `backups_data` |
| Application settings | `/app/data/app-settings.json` | **No dedicated volume** |

All upload subdirectories are covered by the parent upload mount, including directories created at runtime. Settings edits are written into the container filesystem and can be lost on container replacement/recreation.

## Environment behavior

Primary runtime variables:

| Variable | Current behavior |
|---|---|
| `DATABASE_URL` | Required by Prisma and Docker startup. |
| `JWT_SECRET` | Required by Docker startup; application code otherwise has an insecure fallback. |
| `NODE_ENV` | Required by Docker startup; controls production checks and cookie helper behavior. |
| `EXPECTED_DB_HOST` | Optional hostname equality guard. |
| `AUTO_BACKUP_BEFORE_MIGRATE` | Optional, true enables pre-migration dump. |
| `ALLOW_DESTRUCTIVE_MIGRATIONS` | Optional dangerous scanner bypass. |
| `PORT` | Runner defaults to 3000. |
| `HOSTNAME` | Runner sets `0.0.0.0`. |
| `NEXT_TELEMETRY_DISABLED` | Set in build and runtime image. |

The repository has a gitignored `.env` but no `.env.example` at verification time. Do not copy secrets into documentation.

## Operational bypasses and non-guarantees

- `/api/migrate-services` and `/api/migrate-indexes`, which executed raw DDL outside Prisma migration tracking and were middleware-exempt, have been deleted; see [Technical debt](technical-debt.md). The scanner never covered them regardless, since they bypassed `prisma migrate deploy` entirely.
- Manual database operations (any remaining raw-SQL route, or direct database access) can still make schema and migration history diverge; the scanner only covers `prisma migrate deploy`'s own pending migrations.
- A named volume is not an off-host backup.
- Successful `pg_dump` does not prove successful restoration.
- Persistent uploads do not make database rows and file content atomic or mutually consistent.
- Compose health checks prove basic PostgreSQL readiness, not migration or application health.
- There is no application health endpoint, structured deployment audit record, or automatic post-start validation.
