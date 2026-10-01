# API reference

Inventory verified from the current `app/api/**/route.js` tree at commit `3ba4298` on 2026-09-30.

## Authentication notation

- **Explicit**: handler calls `getCurrentUser()`.
- **Middleware**: handler relies on `middleware.js`; no local check.
- **Exempt**: middleware intentionally bypasses the path.
- **Reader blocked**: mutation calls `rejectIfLecteur()`.

Unless marked exempt, the current middleware protects the route. An explicit handler check is still documented because it affects behavior and defense in depth.

## Authentication and profile

| Route | Method | Auth | Purpose / restrictions |
|---|---|---|---|
| `/api/auth/login` | POST | Exempt | Username/password login; active-account check; legacy plaintext upgrade; issues seven-day JWT cookie. |
| `/api/auth/logout` | POST | Exempt | Deletes `auth_token`. |
| `/api/auth/me` | GET | Exempt + explicit | Returns current DB user ID, username, name, and role; does not check `actif`. |
| `/api/auth/profile` | GET | Exempt + explicit | Reads current profile. |
| `/api/auth/profile` | PUT | Exempt + explicit | Updates current profile; not governed by `rejectIfLecteur`. |
| `/api/auth/password` | PUT | Exempt + explicit | Verifies old password and updates current password. |

All `/api/auth/**` routes are middleware-exempt; their handler checks are authoritative.

## Users

| Route | Method | Auth | Purpose / restrictions |
|---|---|---|---|
| `/api/utilisateurs` | GET | Explicit | List RH users. |
| `/api/utilisateurs` | POST | Explicit; reader blocked | Create username account with allowed role. |
| `/api/utilisateurs/[id]` | PUT | Explicit; reader blocked | Update username, name, active state, role, or reset password. |
| `/api/utilisateurs-rh` | GET | Explicit | Legacy user list. |
| `/api/utilisateurs-rh` | POST | Explicit; reader **not** blocked | Legacy user creation path. |
| `/api/create-user` | GET | Middleware | Legacy state-changing GET for fixed development admin credentials. |
| `/api/init/rh` | POST | Exempt | Intended first-user initialization; current count condition is reversed. |
| `/api/emergency/activate-account` | GET | Middleware only | Lists user identity/active fields; source comment incorrectly claims public access. |
| `/api/emergency/activate-account` | POST | Middleware only | Reactivates by username/email; no handler-level role restriction. |

There is no DELETE handler for `/api/utilisateurs/[id]`; UI deactivation is the current account-retirement mechanism.

## Dashboard and search

| Route | Method | Auth | Purpose / restrictions |
|---|---|---|---|
| `/api/dashboard/stats` | GET | Explicit | Counts/aggregates professors, leave, dossiers, and archive queue. |
| `/api/dashboard/historique-conges` | GET | Explicit | Filtered/paginated leave history for dashboard use. |
| `/api/search` | GET | Explicit | Global professor/dossier search; intended for queries of at least two characters from Header. |

## Professors

| Route | Method | Auth | Purpose / restrictions |
|---|---|---|---|
| `/api/professeurs` | GET | Explicit | List/search/filter/paginate professors with referentials. |
| `/api/professeurs` | POST | Explicit; reader blocked | Create professor after field/referential validation. |
| `/api/professeurs` | DELETE | Explicit; reader blocked | Bulk-delete path driven by request data. Database cascades leave and balances. |
| `/api/professeurs/[id]` | GET | Explicit | Professor detail with referentials, leave, balances, and dossiers. |
| `/api/professeurs/[id]` | PUT | Explicit; reader blocked | Update professor identity and referential links. |
| `/api/professeurs/[id]` | DELETE | Explicit; reader blocked | Delete one professor. Dossier snapshots survive through `SetNull`; leave/balance rows cascade. |

## Balances

| Route | Method | Auth | Purpose / restrictions |
|---|---|---|---|
| `/api/professeurs/[id]/soldes` | GET | Explicit | List one professor’s balances. |
| `/api/professeurs/[id]/soldes` | POST | Explicit; reader blocked | Create annual typed balance; composite uniqueness applies. |
| `/api/professeurs/[id]/soldes/[soldeId]` | PUT | Explicit; reader blocked | Update balance with total/remaining validation; does not verify that `soldeId` belongs to URL professor `id`. |
| `/api/professeurs/[id]/soldes/[soldeId]` | DELETE | Explicit; reader blocked | Delete by `soldeId`; does not verify URL professor ownership. |
| `/api/soldes/bulk-add-annual` | POST | Explicit; reader blocked | Create missing 22-day administrative and 10-day exceptional balances for a year. |
| `/api/soldes/import-excel` | POST | Explicit; reader blocked | Import professors and typed/year balances from first Excel sheet; partial per-row results. |
| `/api/soldes/export-excel` | GET | Explicit | Export all professors and dynamic typed/year remaining-balance columns. |

## Leave

| Route | Method | Auth | Purpose / restrictions |
|---|---|---|---|
| `/api/conges` | GET | Explicit | List leave records and related identity/type/creator data. |
| `/api/conges` | POST | Explicit; reader blocked | Create leave, compute end date, and consume balances unless `hors_solde`. |
| `/api/conges/[id]` | PUT | Explicit; reader blocked | Full edit, including `reference_doc`; restores and reconsumes balances when relevant; cannot change `hors_solde` mode. |
| `/api/conges/[id]` | DELETE | Explicit; reader blocked | Restore balance for normal leave, then delete; direct delete for `hors_solde`. |
| `/api/conges/upload` | POST | Explicit; reader blocked | Upload JPEG/PNG/PDF supporting file, maximum 8 MiB. |
| `/api/conges/[id]/decision` | POST | Explicit; reader blocked | Upload/replace JPEG/PNG/PDF official decision, maximum 8 MiB. |
| `/api/conges/[id]/decision` | DELETE | Explicit; reader blocked | Clear decision metadata and delete its file. |
| `/api/uploads/conges/[filename]` | GET | Middleware | Validated supporting-file download. |
| `/api/uploads/decisions/[filename]` | GET | Middleware | Validated decision-file download. |

See [Congés and soldes](conges-soldes.md) for balance order and transactional limitations.

## Dossiers explicatifs

| Route | Method | Auth | Purpose / restrictions |
|---|---|---|---|
| `/api/dossiers-explicatifs` | GET | Explicit | List dossiers with fault type and current professor hospital summary. The dossier list page and the archive page (`/dossiers-explicatifs/a-archiver`) both filter this same response client-side, including by `type_faute`; there is no separate archive-specific endpoint. |
| `/api/dossiers-explicatifs` | POST | Explicit; reader blocked | Multipart creation; active fault type; optional correspondence; writes `ENREGISTRE`. |
| `/api/dossiers-explicatifs/[id]` | GET | Explicit | Dossier detail and ordered document records; history is not included. |
| `/api/dossiers-explicatifs/[id]` | PATCH | Explicit; reader blocked | Merge allowlisted supplemental metadata; rejects `CLOTURE`, `A_ARCHIVER`, `ARCHIVE` but not `ANNULE`. |
| `/api/dossiers-explicatifs/[id]/generate-initial-documents` | POST | Explicit; reader blocked | `ENREGISTRE` only; validates supplemental data; generates DOCX; moves to `DOCUMENTS_INITIAUX_GENERES`. |
| `/api/dossiers-explicatifs/[id]/register-notification` | POST | Explicit; reader blocked | First notification from `DOCUMENTS_INITIAUX_GENERES`; later correction through procedure-generated state. |
| `/api/dossiers-explicatifs/[id]/register-response` | POST | Explicit; reader blocked | First response from `NOTIFIE`; later correction through procedure-generated state. |
| `/api/dossiers-explicatifs/[id]/evaluate-response` | POST | Explicit; reader blocked | Evaluate or correct decision; accepted through `PROCEDURE_SUIVANTE_GENEREE`. |
| `/api/dossiers-explicatifs/[id]/generate-procedure` | POST | Explicit; reader blocked | Automatic DOCX generation using `PROCEDURE_DISCIPLINAIRE`; retained for compatibility but not called by any UI path; requires non-convincing or already-generated state. |
| `/api/dossiers-explicatifs/[id]/update-procedure-document` | POST | Explicit; reader blocked | Normal-workflow manual upload; create-or-update of the `procedure_suivante` document; allowlists only `REPONSE_NON_CONVAINCANTE` (first registration) and `PROCEDURE_SUIVANTE_GENEREE` (replacement) — `ANNULE` and every other status is rejected. |
| `/api/dossiers-explicatifs/[id]/close-dossier` | POST | Explicit; reader blocked | Convincing or procedure-generated only; moves to `A_ARCHIVER`; no closure date/history. |
| `/api/dossiers-explicatifs/[id]/archive` | POST | Explicit; reader blocked | `A_ARCHIVER` only; writes `ARCHIVE`, timestamp, and actor. |
| `/api/dossiers-explicatifs/[id]/annuler` | POST | Explicit; reader blocked | Requires reason; any state except `ARCHIVE`/`ANNULE`; writes cancellation history. |
| `/api/dossiers-explicatifs/[id]/documents/[documentId]/download` | GET | Explicit | Validated dossier-owned document download through path allowlist. |
| `/api/dossiers-explicatifs/[id]/documents/download-all` | GET | Explicit | In-memory ZIP of existing allowlisted dossier files; skips invalid/missing entries. |

See [Dossiers explicatifs](dossiers-explicatifs.md) for the complete transition and correction tables.

## Document templates

| Route | Method | Auth | Purpose / restrictions |
|---|---|---|---|
| `/api/document-template` | GET | Middleware | Lists templates and optional fault type. |
| `/api/document-template` | POST | Explicit; reader blocked | Legacy JSON creation. Validates fields/conflicts, but currently fails to persist `usage`. |
| `/api/document-template/upload` | POST | Explicit; reader blocked | Preferred multipart DOCX creation; generic or fault-specific; active identifier/usage conflict checks. |
| `/api/document-template/[id]` | PUT | Explicit; reader blocked | Update name, identifier, optional fault type, usage, description, and active state. |
| `/api/document-template/[id]` | DELETE | Explicit; reader blocked | Hard-delete when unused; otherwise set `actif = false`. |

The upload route creates the template but does not currently set `cree_par_rh_id`, despite authenticating the creator.

## Referentials

Each standard group follows the same shape:

| API base | Collection | Item | Notes |
|---|---|---|---|
| `/api/categories-personnel` | GET, POST | PUT, DELETE | Personnel category CRUD. |
| `/api/specialites` | GET, POST | PUT, DELETE | Specialty CRUD. |
| `/api/titres` | GET, POST | PUT, DELETE | Title CRUD. |
| `/api/services` | GET, POST | PUT, DELETE | Service CRUD. |
| `/api/hopitaux` | GET, POST | PUT, DELETE | Hospital CRUD. |
| `/api/grades` | GET, POST | PUT, DELETE | Grade CRUD. |
| `/api/types-conge` | GET, POST | PUT, DELETE | Leave-type CRUD with `document_obligatoire`. |

Collection reads are explicit-authenticated. Mutations are explicit-authenticated and reader-blocked. Item routes are `/api/{base}/[id]`.

### Holidays

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/jours-feries` | GET | Explicit | List active by default or all according to query. |
| `/api/jours-feries` | POST | Explicit; reader blocked | Create inclusive holiday date range. |
| `/api/jours-feries/[id]` | PUT | Explicit; reader blocked | Update range/name/active state. |
| `/api/jours-feries/[id]` | DELETE | Explicit; reader blocked | Delete holiday. |

### Fault types

The UI path is `/types-fautes`; the API base is singular `/api/type-faute`.

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/type-faute` | GET | Middleware | List fault types. |
| `/api/type-faute` | POST | Explicit; reader blocked | Create fault type with unique code. |
| `/api/type-faute/[id]` | PUT | Explicit; reader blocked | Update fields/active state. |
| `/api/type-faute/[id]` | DELETE | Explicit; reader blocked | Always soft-deactivates (`actif = false`); it does not physically delete. |

## Application settings

| Route | Method | Auth | Purpose / restrictions |
|---|---|---|---|
| `/api/app-settings` | GET | Explicit | Read merged file-backed settings/defaults. |
| `/api/app-settings` | PUT | Explicit; reader blocked | Merge and write submitted JSON; no strict key allowlist in the save helper. |

## Legacy raw migration endpoints (removed)

`/api/migrate-services` (POST) and `/api/migrate-indexes` (POST) previously existed as middleware-exempt, unauthenticated routes executing raw SQL (`$executeRawUnsafe`) outside Prisma migration tracking — `migrate-services` created/backfilled the `services` table and added a `professeurs.service_id` foreign key conflicting with the current nullable schema; `migrate-indexes` created several `CREATE INDEX IF NOT EXISTS` statements. Both route files and their middleware exemptions have been deleted after a security review found them unauthenticated and unused by any application or deployment code. See [Technical debt](technical-debt.md).
