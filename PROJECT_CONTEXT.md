# Project Context

> The repository is the implementation source of truth. This documentation describes the verified current architecture and business behavior but must be validated against the code before risky implementation changes.

Last verified: **2026-09-30**
Verified commit: **`3ba42989ce7371689d1c65bc2aa04a368b67c114`** (pushed to `origin/main`).

This document, and the detailed docs it links to, describe **committed code at that commit**. Some machines running this repository may have additional uncommitted local changes (check `git status`); those are not described here as current behavior until they are committed and this document is re-verified against the new `HEAD`.

## Application

`gestion-conges-professeurs` is an internal human-resources application for a hospital or public-institution setting. RH staff use it to maintain employee/professor records, register leave and balances, manage administrative referentials, and conduct explanatory or disciplinary dossier workflows.

The application is not a professor self-service portal. Operational data is entered and managed by authenticated RH users.

The user interface is Arabic-first and primarily RTL. Code, API, and database names are mostly French.

## Major modules

| Module | Current responsibility |
|---|---|
| Dashboard | RH totals, leave history, filters, and links to current operational work. |
| Professeurs | Employee identity, Arabic and Latin names, personal fields, organizational referentials, balances, leave history, and dossiers. |
| Congés | Direct RH registration, working-day calculation, balance consumption/restoration, supporting documents, and decision documents. |
| Soldes | Per-professor, per-year, per-leave-type balances; manual maintenance, Excel import/export, and annual bulk creation. |
| Dossiers explicatifs | Creation, generated documents, notification, response, evaluation, manual disciplinary-procedure upload, closure, archive (with fault-type filtering), and cancellation. |
| Document templates | Active/inactive DOCX templates, fault-specific or generic assignment, usage classification, and generation sources. |
| Referentials | Categories, specialties, titles, services, hospitals, grades, leave types, holidays, and fault types. |
| RH users | Username/password accounts, active state, profile/password management, and RH/read-only roles. |
| Application settings | File-backed switches affecting leave start-date selection. |
| Global search | Header search across professors and explanatory dossiers. |

## Technology stack

- Next.js `16.0.10`, App Router, standalone production output
- React `19.2.1`
- Tailwind CSS v4 with shadcn-style local primitives
- PostgreSQL 16 in the provided Docker Compose configuration
- Prisma `7.2.x` with `@prisma/adapter-pg`
- JWT authentication in the `auth_token` HTTP-only cookie — `jsonwebtoken` in Node-runtime route handlers (`lib/auth.js`), `jose` in Edge-runtime `middleware.js`; both currently share the same insecure fallback secret if `JWT_SECRET` is unset (see `docs/technical-debt.md`)
- `bcryptjs` for primary password helpers; `bcrypt` is also a dependency, used by a small number of legacy/bootstrap scripts and routes
- `pizzip` and `docxtemplater` for DOCX generation
- `xlsx` for balance import/export
- Local filesystem storage below `public/uploads/`
- Node 20 Alpine multi-stage Docker image

Exact versions and scripts are authoritative in `package.json` and `package-lock.json`. No lint or automated test script is currently configured.

## High-level architecture

```text
Browser / Arabic RTL client pages
        |
        | fetch + auth_token cookie
        v
Next.js App Router pages and route handlers
        |                         |
        | Prisma                  | fs/promises
        v                         v
PostgreSQL                  public/uploads/**
```

- Pages live under `app/`.
- Operational API handlers live under `app/api/**/route.js`.
- Most administrative routes use the shared `components/layout/PageShell.jsx`, either through a route layout or directly in the page.
- `PageShell` owns the fixed Header, collapsible right Sidebar, content surface, Footer, and `UserProvider`.
- Prisma access is centralized in `lib/prisma.js`.
- Authentication helpers are in `lib/auth.js`; role helpers are in `lib/roles.js`; Edge-runtime token verification is in `middleware.js`.
- Dossier-specific UI is under `components/dossiers-explicatifs/`.
- Generic UI primitives are under `components/ui/`.
- Application settings are stored in `data/app-settings.json`, not PostgreSQL.

See [Technical architecture](docs/architecture.md) and [UI system](docs/ui-system.md).

## Roles

Only two role values are meaningful in current code: `UTILISATEUR_RH` (normal read/write RH access) and `LECTEUR_RH` (intended read-only). The `role` column is a free-form `String`, not a database enum, and there is no distinct administrator role — ordinary `UTILISATEUR_RH` accounts can access user-management and settings mutations. `rejectIfLecteur()` in `lib/roles.js` is the enforcement point, called individually per mutation route; it is not centralized, and known gaps exist (see [Authentication and authorization](docs/auth-authorization.md) and [Technical debt](docs/technical-debt.md)).

## Production-safety principles

1. `prisma migrate deploy` is the only migration mechanism run at container startup (`docker/entrypoint.sh`); there is no `db push`, `migrate reset`, or seed step in that path.
2. A pending-migration destructive-pattern scanner (`docker/scan-pending-migrations.cjs`) runs before `migrate deploy` and can be bypassed with `ALLOW_DESTRUCTIVE_MIGRATIONS=true`; it is a regex-based guard, not semantic SQL analysis, and it is skipped entirely on a fresh database with zero finished migrations.
3. An optional pre-migration `pg_dump` (`AUTO_BACKUP_BEFORE_MIGRATE=true`) is available but disabled by default and has no automatic retention, encryption, or restore test.
4. The migration history contains real historical destructive operations (whole-table drops later recreated, required columns added without backfill) — see [Database](docs/database.md) and [Technical debt](docs/technical-debt.md). A clean fresh-database bootstrap is not evidence that those historical operations were safe for a populated database at the time.
5. **Application rollback is not database rollback.** Redeploying a previous application version does not undo an already-applied migration or already-mutated data/files.
6. Two endpoints — `/api/migrate-services` and `/api/migrate-indexes` — are explicitly exempt from authentication middleware and execute raw, unauthenticated DDL. This is a live, currently-reachable risk, not only historical debt.

## Critical invariants

These are current architectural or business constraints. They are not guarantees that every route enforces them perfectly; known gaps are documented separately.

1. The repository, current Prisma schema, and migration SQL override historical prose.
2. Production database work must be designed for populated databases.
3. Never treat `prisma migrate reset` or `prisma db push` as a production migration strategy.
4. Review migration SQL directly, including historical and pending migrations.
5. A dossier stores both an optional live `Professeur` relationship and required identity snapshot strings.
6. New dossiers normally begin at `ENREGISTRE`; the schema default remains historical `BROUILLON`.
7. From a non-convincing response, RH manually selects `AVERTISSEMENT`/تنبيه or `RETENUE`/اقتطاع and uploads the corresponding document (`update-procedure-document`); this is the normal-workflow path to `PROCEDURE_SUIVANTE_GENEREE`. Automatic DOCX generation (`generate-procedure`) still exists in the codebase for backward compatibility and historical documents, but is not called from any current UI path.
8. Closure moves eligible dossiers to `A_ARCHIVER`; archive is a separate manual transition to `ARCHIVE`. The archive list additionally supports filtering by fault type (`TypeFaute`), reusing the existing relation with no schema change.
9. `ANNULE` exists and requires an entered cancellation reason through the cancellation endpoint.
10. Dossier documents are database records whose content is held on the local filesystem. `procedure_suivante` documents may have `origine: GENERE` (historical, template-based) or `origine: TELEVERSE` (current manual upload) — both remain valid and downloadable, including through the ZIP download, via the shared `/uploads/procedures/`-aware path allowlist in `lib/dossiers-explicatifs/documentPath.js`.
11. Active templates can be fault-specific or generic (`type_faute_id = null`).
12. Generated initial documents prefer fault-specific templates and fall back to generic templates.
13. Leave end dates are calculated server-side in working days, excluding weekends and active holiday ranges.
14. Normal leave records consume matching, unexpired balances; `hors_solde` records do not.
15. `LECTEUR_RH` is intended to be read-only, but authorization enforcement is not fully centralized.
16. Arabic content remains RTL; technical identifiers, dates, and references may be explicitly LTR.
17. Upload and database writes are not globally atomic. Do not assume a database transaction also rolls back filesystem changes.
18. Docker's migration scanner is a limited pattern guard, not proof of migration safety.

## Current implementation boundaries

- PostgreSQL holds business records and document metadata; it does not hold uploaded file bytes.
- `public/uploads/` is operational data and must be backed up together with PostgreSQL for a coherent recovery point.
- Application settings are JSON-file-backed and are not part of database backups.
- `DossierHistory` exists but is not a complete workflow audit log; cancellation is the only transition that currently writes it consistently.
- `ARCHIVE` and `ANNULE` are presented as terminal states, but terminal write protection is not centralized and has documented gaps.
- `date_limite_reponse` and `en_retard` exist in the dossier schema but are not actively calculated by current routes.
- `date_cloture` does not exist in the schema, despite remaining UI references (those UI branches never render).
- Template active-identifier uniqueness uses a database partial index that Prisma cannot represent as a normal `@unique` field.
- The supplied Docker Compose topology is a local/single-host deployment definition, not a complete production platform.
- No automated test suite and no lint script are currently configured. Validation expectations therefore depend on focused inspection and builds unless tests are added by an explicit task.
- Legacy and emergency endpoints remain in the API tree. Their presence does not make them recommended integration surfaces.
- Existing technical debt must be documented as a limitation, not promoted into a new invariant.
- Some documentation under `docs/` may describe local-only, uncommitted application behavior if a session edited it ahead of the corresponding code being committed. When in doubt, `git status`/`git log` and the actual route/component files are authoritative over any doc, including this one.

## Authoritative detailed documentation

| Document | Scope |
|---|---|
| [Architecture](docs/architecture.md) | Next.js structure, layouts, shared code, storage, settings, and search. |
| [Database](docs/database.md) | Exact schema, relations, constraints, migrations, seed behavior, and hazards. |
| [Dossiers explicatifs](docs/dossiers-explicatifs.md) | Business transitions, UI steps, documents, corrections, cancellation, and enforcement gaps. |
| [Congés and soldes](docs/conges-soldes.md) | Working-day rules, balances, uploads, import/export, and transactional risks. |
| [Authentication and authorization](docs/auth-authorization.md) | JWT, cookies, middleware, roles, current-user handling, and security inconsistencies. |
| [API reference](docs/api-reference.md) | Current route/method inventory and important restrictions. |
| [Deployment and operations](docs/deployment-operations.md) | Docker startup, migrations, backups, restore, volumes, and environment handling. |
| [UI system](docs/ui-system.md) | Current Arabic-first visual and interaction conventions. |
| [Technical debt](docs/technical-debt.md) | Verified current risks and inconsistencies only. |

As of the documentation-synchronization commit immediately following `3ba4298`, this file, `AGENTS.md`, and every file in the table above are committed to git — a fresh clone or CI checkout will have the complete set. If any of these files later shows as untracked or modified again (`git status`), treat it as drift from this committed baseline and re-verify before trusting it.

## Repository map

```text
app/                         Next.js pages, route layouts, and APIs
components/layout/           PageShell, Header, Sidebar, Footer, legacy Nav
components/ui/               Reusable generic UI primitives
components/dossiers-explicatifs/
frontend/src/lib/            Dossier status labels and colors
lib/                         Auth, Prisma, roles, settings, dates, and domain helpers
prisma/schema.prisma         Current Prisma model declaration
prisma/migrations/           Actual schema-evolution history
prisma/seed.js               Development-oriented seed behavior
public/uploads/              Runtime local document storage
data/app-settings.json       Runtime file-backed settings
docker/                      Entrypoint, migration scanner, and restore helper
Dockerfile                   Standalone production image
docker-compose.yml           Local/single-host application and PostgreSQL stack
```

Other root-level files present but not part of the documented architecture: `README.md`, `RUN.md`, `QUICKSTART.md`, `OPTIMIZATIONS.md`, `PROMPT_ENGINEERING_GUIDE.md`, and an empty stray `temp_migration.sql`. `src/generated/` is a gitignored, unused local Prisma client build artifact — the application imports Prisma from `@prisma/client`, not from `src/generated`.

## Before changing a domain

- Read `AGENTS.md`.
- Read the relevant document above.
- Inspect the actual route handlers, pages, schema, and migrations involved.
- Check `docs/technical-debt.md` so an existing inconsistency is not accidentally documented or implemented as an invariant.
- Run `git status`/`git diff` first so uncommitted work already in the tree is not lost, misattributed, or mistaken for shipped behavior.
- For high-risk work, perform explicit impact analysis before implementation.
- Use the exact current schema, route, status, field, and component names found in the repository.
