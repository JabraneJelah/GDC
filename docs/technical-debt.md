# Verified current technical debt

Verified on 2026-09-15. This file records present issues supported by current code. It intentionally excludes resolved historical items such as missing initial-document categories, placeholder-only procedure generation, and page-local `PageShell` implementations.

Severity indicates potential impact, not a remediation commitment.

## Critical

### Middleware-exempt raw migration endpoints

**Area:** database, security, deployment

`/api/migrate-services` and `/api/migrate-indexes` are explicitly exempted by middleware and execute `$executeRawUnsafe` DDL.

Risks:

- unauthenticated schema changes;
- bypass of `_prisma_migrations` and the pending migration scanner;
- live schema drift;
- `/api/migrate-services` attempts to make `service_id` required, conflicting with the current nullable Prisma field;
- data and availability impact from unexpected invocation.

### Non-transactional leave/balance mutations

**Area:** leave, balances, data integrity

Leave create, full update, and delete perform multiple balance mutations plus a leave mutation without one Prisma transaction. Read-modify-write calculations also lack locking/atomic conditional updates.

Failure or concurrency can leave consumed/restored balances inconsistent with the leave record.

## High

### Stale JWT role and activation state

**Area:** authentication, authorization

JWTs last seven days and contain the role. Middleware and `getCurrentUser()` verify the token without reloading `actif` or current role. Mutation guards use the token role, while `/api/auth/me` returns the database role.

Consequences:

- deactivated users can continue using an existing token;
- role changes may not affect backend authorization until re-login;
- frontend and backend can temporarily disagree on role.

### Login cookie is not secure in production

**Area:** authentication

The login route sets `secure: false` directly. The safer environment-aware `setAuthCookie()` helper is not used by login.

### Bootstrap and legacy account routes

**Area:** authentication, operations

- `/api/init/rh` is middleware-exempt and appears to reverse its first-user count condition.
- `/api/create-user` mutates through GET and exposes fixed development credentials.
- The created email-only account does not match username-only login.
- `/api/emergency/activate-account` comments claim public access, but middleware currently protects it; handler-level auth/role checks are absent.
- Legacy `/api/utilisateurs-rh` POST does not block `LECTEUR_RH`.

### `ANNULE` is not consistently terminal

**Area:** dossier workflow

The UI presents cancelled dossiers as terminal, but:

- supplemental metadata PATCH omits `ANNULE` from `FINAL_STATUSES`;
- cancellation itself is allowed from `A_ARCHIVER` and historical `CLOTURE`.

`update-procedure-document` no longer uses a `FINAL_STATUSES` blocklist; it now allowlists only `REPONSE_NON_CONVAINCANTE` and `PROCEDURE_SUIVANTE_GENEREE`, so `ANNULE` (and every other status) is rejected by default rather than by omission.

Terminal state logic is duplicated rather than centralized.

### Filesystem/database operations are not atomic

**Area:** uploads, generation, data integrity

Examples:

- dossier correspondence is written before dossier transaction;
- initial/procedure files are generated before document/status transaction;
- notification and response replacements update paths but do not remove old files;
- decision replacement removes the old file before new persistence completes;
- template upload writes before record creation;
- leave upload can remain unattached when a later API call fails.

The system can accumulate orphaned files or database paths pointing to missing content.

### Historical migration chain contains destructive operations

**Area:** database, deployment

The migration history drops business columns and entire referential tables, then recreates some structures later. The fresh-database scanner bypass means the historical chain is never scanned during bootstrap. See [Database](database.md).

## Medium

### Prisma partial-index/seed mismatch

**Area:** database, seed

The database has a partial unique index for active template identifiers, but Prisma does not expose `identifiant` as unique. The seed nevertheless uses it as `upsert.where`. Seed execution may fail.

Additional seed concerns:

- PDF template rows are created for a DOCX rendering path;
- seeded source paths differ from upload paths;
- default `admin/admin123` credentials are development-only.

### Historical pending:// procedure documents

**Area:** dossier documents

A number of `procedure_suivante` `DossierDocument` rows created before the manual-upload workflow have `chemin_fichier` values starting with `pending://` (never materialized to a real file). These predate `update-procedure-document`'s create-or-update behavior and are not automatically repaired; the UI treats `pending://` as not-ready and offers manual upload to replace them, but nothing does this in bulk.

### Template consistency relies partly on application checks

**Area:** database, templates

- Active identifier uniqueness is case-sensitive in the database but checked case-insensitively by APIs.
- Active `(type_faute_id, usage)` uniqueness has no database constraint.
- Read-then-create/update checks can race.
- JSON `POST /api/document-template` validates `body.usage` for conflicts but does not persist it.
- Multipart template upload authenticates a creator but does not set `cree_par_rh_id`.

### Dossier history is incomplete

**Area:** auditability

Only cancellation currently writes `DossierHistory`. Other transitions do not. Detail API/UI does not expose a full history timeline.

### Closure/evaluation comments are not persisted

**Area:** dossier workflow

Evaluation ignores comments. Closure reads `commentaire_cloture` and reports whether it was supplied but stores neither the comment nor a closure date. The UI still references nonexistent `date_cloture`.

### Procedure/evaluation correction can leave stale documents

**Area:** dossier workflow

Re-evaluation is allowed from `PROCEDURE_SUIVANTE_GENEREE`. Switching to a convincing decision leaves the already generated procedure document and selected template/type metadata attached.

### Settings persistence and semantics

**Area:** configuration, deployment

- Settings are stored in writable JSON rather than PostgreSQL.
- `/app/data` is not a supplied persistent volume.
- PUT merges arbitrary submitted keys; no strict server allowlist.
- Either blocking switch invokes a helper that rejects both weekends and holidays, so the two settings are not independent.
- End-date calculation always excludes both, regardless of switches.

### Incomplete authorization centralization

**Area:** authorization

`rejectIfLecteur()` is manually repeated. Some reads rely only on middleware and at least one legacy mutation omits the reader check. There is no central route policy or administrator role.

### Authentication response inconsistency

**Area:** API behavior

Missing-token API requests receive JSON 401, but invalid-token API requests are redirected to `/login`. Client code must handle two response shapes for an authentication failure.

### Debug and sensitive operational logging

**Area:** observability

`lib/prisma.js` attempts synchronous writes to `.cursor/debug.log` during initialization and includes connection metadata previews. Login logs usernames and detailed flow messages. Logging is not centralized or environment-gated consistently.

### Professor deletion bypasses leave balance restoration

**Area:** data lifecycle

Database cascade deletes professor leave and balances. This is internally consistent after the professor is gone, but it bypasses application leave-deletion restoration behavior and permanently removes related leave history. The intended retention policy is not documented in code.

### No database-level role or document-category constraints

**Area:** data quality

Roles and dossier document categories are free-form strings. Only selected routes constrain them.

### Nested balance route does not verify professor ownership

**Area:** balances, API integrity

`PUT` and `DELETE /api/professeurs/[id]/soldes/[soldeId]` load and mutate by `soldeId` only. They do not verify that the balance belongs to the professor `id` in the URL.

## Low / maintainability

### Duplicated status and current-user logic

**Area:** architecture

- Status labels/groupings and terminal arrays exist in multiple UI/API files.
- Header and `UserProvider` separately fetch `/api/auth/me`.
- Dossier transition rules are route-local rather than one state machine.

### Mixed shell attachment and legacy navigation

**Area:** UI architecture

Most modules use route layouts, while dossier/template/fault pages wrap themselves directly. The unused older French `Nav` remains alongside the canonical Header/Sidebar system.

### Mixed user-facing languages and encoding artifacts

**Area:** UI/API quality

User-visible errors mix Arabic and French. Several source files display mojibake in comments or strings under current reading/encoding, increasing maintenance risk.

### Missing indexes for leave workloads

**Area:** database performance

Earlier leave/balance indexes were dropped by a historical migration and not restored through later Prisma migrations. A legacy raw endpoint can add some indexes, making deployed performance dependent on out-of-band history.

### In-memory ZIP generation

**Area:** document downloads

Download-all reads every available dossier document and generates the complete ZIP in memory. No total size/file-count bound is enforced.

### Missing automated tests

**Area:** quality assurance

No automated unit, integration, API, migration, or UI test suite is present in the repository. `package.json` has no test script. High-risk behavior currently relies on manual inspection/build validation.

Priority candidates for future tests include:

- valid/invalid dossier transitions and corrections;
- terminal-state write rejection;
- role/activation changes during active sessions;
- balance consumption/restoration under failures and concurrency;
- migration scanner cases and fresh bootstrap;
- upload/download path allowlists;
- RTL layout regressions.
