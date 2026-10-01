# Congés and soldes

Verified against `app/api/conges/**`, `app/api/professeurs/[id]/soldes/**`, `app/api/soldes/**`, and `lib/working-days.js`/`lib/solde-expiration.js` at commit `3ba4298` on 2026-09-30.

This document distinguishes current business behavior from verified implementation risks. It describes only what is committed at that commit; local, uncommitted attachment-management changes to this module are intentionally not described here (see `docs/technical-debt.md` if applicable, and re-verify this document once such work is actually committed).

## Data model

- `Conge` belongs to one professor, one leave type, and one creating RH user.
- `SoldeConge` belongs to one professor and one leave type for one year.
- Balance uniqueness is `(professeur_id, annee, type_conge_id)`.
- `TypeConge.document_obligatoire` informs the UI whether a supporting document is required.
- `JourFerie` stores an inclusive active/inactive date range.

See [Database](database.md) for exact fields and delete behavior.

## Working-day calculation

`lib/working-days.js` defines working days as Monday through Friday excluding every active holiday range that covers the date.

`getDateFinFromDuree(date_debut, duree_jours)` treats the start date as the first possible counted working day and returns the date of the Nth working day. The leave API computes `date_fin` server-side; callers do not control it directly.

The helper preloads overlapping holidays and has a bounded iteration count. `getWorkingDaysBetween` applies the same weekend/holiday rule inclusively.

## Configurable start-date blocking

File-backed settings expose:

- `block_holiday_selection`;
- `block_weekend_selection`.

On create/update, the API validates `date_debut` with `isWorkingDay()` when either switch is true. `isWorkingDay()` rejects both weekends and holidays, so the switches currently act as one combined enable/disable condition rather than two independent controls.

Regardless of these settings, end-date calculation always excludes weekends and active holidays.

## Leave creation

`POST /api/conges` requires an authenticated non-reader and validates:

- professor;
- leave type;
- start date;
- positive integer duration.

It computes the end date, verifies professor/type existence, and then either consumes balances or creates a `hors_solde` record.

### Normal balance consumption

For `hors_solde = false`:

1. Load balances for the same professor and leave type.
2. Keep only balances with `expire_le >= now` and `jours_restants > 0`.
3. Sort by ascending year.
4. Reject when none exist or their total is insufficient.
5. Prefer the balance whose year equals the leave start year, even if an older valid balance exists.
6. If that balance is insufficient or absent, consume remaining days from other balances in ascending-year order.
7. Create the leave after balance updates.

This is therefore “current leave year first, then oldest other valid balance,” not strict oldest-first consumption.

### `hors_solde`

When `hors_solde = true`:

- no balance existence or sufficiency check is performed;
- no balance is consumed;
- the leave is still stored with calculated dates and normal document metadata.

The current update API does not permit changing an existing leave between balance-backed and `hors_solde`; it instructs callers to delete and recreate.

### Other stored values

- `nom_interim` stores one full substitute name. Some request destructuring still mentions legacy `prenom_interim`, but the schema and saved record do not.
- `reference_doc` is nullable text and commonly contains serialized JSON metadata returned by the upload route.
- `cree_par_rh_id` is taken from the current JWT.

## Leave modification

`PUT /api/conges/[id]` updates core leave fields, including `reference_doc`.

- It recomputes `date_fin` from the new start/duration.
- It keeps the existing `hors_solde` mode.
- If a balance-backed leave’s duration, professor, type, or year changes, it first restores the old duration and then consumes the full new duration against the new target balances.
- Restoration prioritizes the old leave year, then other applicable balances.
- New consumption prioritizes the new leave year, then other ascending-year balances.
- It rejects insufficient balance for the new configuration.
- Supporting-document metadata (`reference_doc`) is replaced as part of this same full edit; there is currently no narrower endpoint dedicated to only the supporting document.

## Leave deletion

`DELETE /api/conges/[id]`:

- deletes a `hors_solde` record without touching balances;
- otherwise restores the leave duration into matching balances without exceeding each `jours_total`;
- prioritizes the leave-year balance, then other balances;
- deletes the leave after restoration logic.

The general leave DELETE path does not delete the associated `reference_doc`/`decision_doc` physical files; deleting a leave record does not clean up its supporting or decision documents on disk. Professor deletion cascades leave rows at database level and does not run application balance restoration logic.

## Balance expiration

`lib/solde-expiration.js` derives expiration from the leave type’s name:

- names containing `exceptionnel` or the tolerated spelling `excepcionel`: December 31 of the balance year;
- all other names: December 31 of the following year.

This is name-based business logic, not an enum or explicit database policy field.

## Manual balance operations

Professor-specific endpoints:

- `GET /api/professeurs/[id]/soldes`
- `POST /api/professeurs/[id]/soldes`
- `PUT /api/professeurs/[id]/soldes/[soldeId]`
- `DELETE /api/professeurs/[id]/soldes/[soldeId]`

They expose and mutate per-type annual balances. Mutation routes reject `LECTEUR_RH`. The composite database unique key prevents two balances for the same professor/year/type.

The nested `[id]/soldes/[soldeId]` PUT and DELETE handlers use `soldeId` but do not verify that the balance belongs to the professor ID in the URL. The route nesting therefore does not currently enforce ownership.

## Annual bulk creation

`POST /api/soldes/bulk-add-annual` accepts a year from 2000 through 2100.

It searches leave-type names to identify administrative/annual and exceptional types, then iterates professors and creates missing balances:

- administrative: 22 total and remaining days;
- exceptional: 10 total and remaining days.

Existing composite-key balances are skipped. Expiration uses `getExpireLe`. The operation is a sequence of individual queries and inserts, not one transaction.

## Excel import

`POST /api/soldes/import-excel` accepts `.xlsx` and `.xls` and reads the first worksheet.

The importer:

- normalizes multilingual/variant headers;
- detects identity, organization, personal, Arabic-name, and balance columns;
- recognizes balance columns by leave type and year;
- may create a missing exceptional leave type;
- matches existing professors by PPR first, then CIN, then normalized name;
- skips ambiguous name matches;
- can create professors when enough required referential data is available;
- fills selected missing fields on existing professors rather than blindly replacing all identity data;
- warns when optional referential values are unrecognized;
- creates or updates balance `jours_restants` per detected type/year;
- returns success, warning, skipped-row, and error details.

The import processes rows and related writes incrementally. It is not one all-or-nothing transaction; partial success is expected and reported.

## Excel export

`GET /api/soldes/export-excel` loads professors and balances, discovers all existing `(leave type, year)` combinations, and creates a worksheet with identity columns followed by dynamic balance columns. The response filename is `soldes-conges-YYYY-MM-DD.xlsx`.

## Supporting documents

`POST /api/conges/upload` accepts JPEG, PNG, or PDF up to 8 MiB. It writes a UUID-based filename under `public/uploads/conges` and returns metadata including `fileUrl`, `fileName`, `fileType`, and size.

`reference_doc` stores the serialized metadata. `GET /api/uploads/conges/[filename]` validates a basename-like filename and returns the file. Middleware requires authentication for the current URL pattern.

Replacing `reference_doc` currently happens through the general `PUT /api/conges/[id]` edit (see above), which overwrites the stored metadata but does not delete the previous physical file — an old, no-longer-referenced file can be left on disk after a replacement. Uploading a file and then failing to attach its metadata (e.g. the subsequent `PUT` failing or being abandoned) also leaves an orphan.

## Decision documents

`POST /api/conges/[id]/decision` accepts JPEG, PNG, or PDF up to 8 MiB, writes to `public/uploads/decisions`, and stores serialized metadata in `decision_doc`.

When replacing a decision, the route deletes the old file before writing and persisting the new one. Failure after deletion can leave the record pointing at missing old content.

`DELETE /api/conges/[id]/decision` clears the database metadata and removes the associated file. `GET /api/uploads/decisions/[filename]` provides authenticated file retrieval.

## Intended behavior versus transactional risks

Intended behavior is that balance consumption/restoration and the corresponding leave mutation succeed together. Current implementation does not guarantee that:

- leave creation updates one or more balances and then creates the leave without `prisma.$transaction`;
- leave modification restores old balances, consumes new balances, and updates the leave without one transaction;
- leave deletion restores balances and then deletes the leave without one transaction;
- concurrent requests use read-modify-write balance values without row locking or atomic conditional updates;
- annual bulk creation and Excel import are multi-write partial operations;
- filesystem writes/deletes cannot participate in Prisma transactions.

A mid-operation failure or concurrent request can therefore produce balance/leave inconsistency. This is a known issue, not intended business behavior.
