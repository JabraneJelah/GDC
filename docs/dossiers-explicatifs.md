# Dossiers explicatifs

Verified against the repository at commit `3ba4298` on 2026-09-30.

This document describes the current implementation, not an idealized workflow. Database statuses, permitted API corrections, and five UI steps are distinct concepts.

## Core record design

A `DossierExplicatif` contains:

- an optional live `professeur_id` relation;
- required snapshots: `nom_complet`, `matricule`, `profil`, and `service`;
- required fault date, fault type, and creator;
- optional details and fault-specific JSON metadata;
- workflow status and decision fields;
- notification, response, closure-actor, archive, procedure, and cancellation metadata;
- related `DossierDocument` and `DossierHistory` rows.

The snapshot preserves the identity used when the dossier was created even if the professor is later edited or deleted. The live relation is still used for selected current information, such as hospital display and template data.

## Creation

`POST /api/dossiers-explicatifs` accepts multipart form data:

- required `professeur_id`;
- required `date_faute`;
- required `type_faute_id`;
- optional `details`;
- optional `correspondance` file.

The route requires an authenticated non-reader RH user, validates the professor and an active fault type, and generates `DOS-YYYYMMDD-RANDOM6`, retrying up to five times.

Snapshot behavior:

- full name prefers `nom_ar + prenom_ar` when both exist; otherwise it uses `prenom + nom`;
- matricule is PPR or an empty string;
- profile prefers grade, then title, then personnel category;
- service is the related service name or an empty string.

The route explicitly writes `statut: ENREGISTRE`, overriding the schema’s historical `BROUILLON` default.

### Correspondence upload

Optional correspondence accepts PDF, JPEG, or PNG. It is written to `public/uploads/correspondances` before the Prisma transaction. The transaction creates a `DossierDocument` with:

- `origine: TELEVERSE`;
- `categorie: correspondance_service`;
- `identifiant: CORR-{dossierId}`.

A failed database transaction can leave the already-written file orphaned.

## Supplemental metadata

`PATCH /api/dossiers-explicatifs/[id]` merges allowlisted keys into `donnees_supplementaires`.

The allowlist comes from `lib/dossiers-explicatifs/extraFields.js` and is keyed by `TypeFaute.code`. Current special cases collect required medical certificate date and duration values for:

- `CERTIFICAT_MEDICAL_HORS_DELAI`;
- `AZS` if that code exists in deployed data;
- `CONGE_MALADIE_NON_JUSTIFIE`.

Unknown submitted keys are silently omitted. Existing JSON keys are retained. The PATCH route rejects `CLOTURE`, `A_ARCHIVER`, and `ARCHIVE`, but does not reject `ANNULE`.

Initial generation checks required supplemental fields and returns a blocking message when they are missing.

## Template selection

Initial document generation selects active usages:

- `LETTRE_EXPLICATIVE`;
- `BORDEREAU_NOTIFICATION`.

Procedure generation selects active usage:

- `PROCEDURE_DISCIPLINAIRE`.

Both generation paths first query templates for the dossier’s `type_faute_id`. If none are found, they query generic templates where `type_faute_id = null`.

This fallback is all-or-nothing for the initial query: generic templates are queried only when the fault-specific query returns zero rows, not separately for each missing usage.

## Initial document generation

`POST /api/dossiers-explicatifs/[id]/generate-initial-documents` is allowed only from `ENREGISTRE`.

The route:

1. validates required supplemental fields;
2. locates active fault-specific or generic initial templates;
3. refuses generation when generated records already exist for those template IDs;
4. loads each template from an allowlisted path below `public`;
5. renders DOCX content with `pizzip` and `docxtemplater`;
6. writes files with exclusive `wx` behavior to `public/uploads/generated`;
7. creates document records and updates status in a Prisma transaction.

Categories are currently populated:

| Template usage | Document category |
|---|---|
| `LETTRE_EXPLICATIVE` | `lettre_explicative` |
| `BORDEREAU_NOTIFICATION` | `bordereau_notification` |

Status becomes `DOCUMENTS_INITIAUX_GENERES`.

Filesystem generation occurs before the database transaction; generated files can remain after transaction failure.

## Notification and correction

First registration uses `POST /api/dossiers-explicatifs/[id]/register-notification` from `DOCUMENTS_INITIAUX_GENERES`.

It requires:

- `date_notification`;
- a PDF, JPEG, or PNG proof on first registration.

The proof is stored in `public/uploads/proofs` and recorded as `TELEVERSE` / `preuve_notification`. First registration changes status to `NOTIFIE`.

Correction is permitted without changing status from:

- `NOTIFIE`;
- `REPONSE_RECUE`;
- `REPONSE_CONVAINCANTE`;
- `REPONSE_NON_CONVAINCANTE`;
- `PROCEDURE_SUIVANTE_GENEREE`.

A correction may update the date without a replacement file. If a new file is provided, the newest existing notification document row is updated; additional duplicate rows are deleted from the database. Old physical files are not deleted.

## Response and correction

First registration uses `POST /api/dossiers-explicatifs/[id]/register-response` from `NOTIFIE`.

It requires:

- `date_reponse`;
- a PDF, JPEG, PNG, or DOCX response file on first registration.

The file is stored in `public/uploads/responses` and recorded as `TELEVERSE` / `reponse_agent`. First registration changes status to `REPONSE_RECUE`.

Correction is permitted, without changing current status, from:

- `REPONSE_RECUE`;
- `REPONSE_CONVAINCANTE`;
- `REPONSE_NON_CONVAINCANTE`;
- `PROCEDURE_SUIVANTE_GENEREE`.

Replacement behavior mirrors notification correction and can leave old files on disk.

## Evaluation

`POST /api/dossiers-explicatifs/[id]/evaluate-response` accepts only:

- `CONVAINCANTE` → `REPONSE_CONVAINCANTE`;
- `NON_CONVAINCANTE` → `REPONSE_NON_CONVAINCANTE`.

It is accepted from `REPONSE_RECUE` and, as a correction, from either evaluated status or `PROCEDURE_SUIVANTE_GENEREE`. The route updates `decision_par_rh_id`.

No evaluation comment is accepted or persisted. Changing an already generated procedure dossier back to a convincing decision does not delete or invalidate the existing procedure document.

## Procedure document (manual upload)

The normal RH workflow for المسطرة التأديبية is manual document upload, not automatic generation. RH selects `type_procedure` (`AVERTISSEMENT` or `RETENUE`) and uploads the corresponding document; no UI path calls automatic generation.

`POST /api/dossiers-explicatifs/[id]/update-procedure-document` handles both first registration and replacement. It is permitted only from:

- `REPONSE_NON_CONVAINCANTE` — first registration;
- `PROCEDURE_SUIVANTE_GENEREE` — replacement/correction.

Any other status, including `ANNULE`, `CLOTURE`, `A_ARCHIVER`, and `ARCHIVE`, is rejected. This is an explicit allowlist rather than the blocklist the route previously used, so it does not carry forward the historical `ANNULE` enforcement gap described in [Technical debt](technical-debt.md).

It requires a `type_procedure` value and an uploaded PDF, JPEG, PNG, or DOCX file. It creates-or-updates the dossier's `procedure_suivante` `DossierDocument` in one Prisma transaction:

- if none exists, creates one;
- if one exists — including a stale `pending://` placeholder row, or a document previously created by the (now UI-retired) automatic generation route — updates it in place; no duplicate row is created.

The document is written with `origine: TELEVERSE`, `template_id: null`. In the same transaction the dossier is updated with `type_procedure_selectionne`, `template_procedure_id: null`, and `statut: PROCEDURE_SUIVANTE_GENEREE`. The file is written to `public/uploads/procedures` before the transaction runs; if the transaction fails, no success is reported and the dossier status does not advance (the file can be left orphaned on disk, consistent with the rest of this codebase's upload routes).

### Automatic generation (retained, not part of the normal workflow)

`POST /api/dossiers-explicatifs/[id]/generate-procedure` still exists, is not called by any UI path, and is not deleted. It requires `type_procedure` equal to `AVERTISSEMENT` or `RETENUE` and is permitted from the same two statuses as manual upload (`REPONSE_NON_CONVAINCANTE` for initial generation, `PROCEDURE_SUIVANTE_GENEREE` for regeneration).

The requested type is stored in `type_procedure_selectionne`, but template lookup always uses `TemplateUsage.PROCEDURE_DISCIPLINAIRE`; it does not select an `AVERTISSEMENT` or `RETENUE` usage template.

The route generates a real DOCX in `public/uploads/generated`. On first generation it creates a `GENERE` / `procedure_suivante` document. On regeneration it updates the existing generated procedure row's path and title. It sets `template_procedure_id` and status `PROCEDURE_SUIVANTE_GENEREE`.

Previously generated physical files are not removed when the document row is repointed. Historical `GENERE` documents created by this route before the manual-upload workflow shipped remain valid, downloadable, and unmodified; `update-procedure-document` only overwrites a `procedure_suivante` row's content when an RH user explicitly performs a manual upload against it.

The `PROCEDURE_DISCIPLINAIRE` `DocumentTemplate` rows this route depends on are retained and not deactivated.

## Closure

`POST /api/dossiers-explicatifs/[id]/close-dossier` accepts:

- `REPONSE_CONVAINCANTE`;
- `PROCEDURE_SUIVANTE_GENEREE`.

It writes:

- `statut: A_ARCHIVER`;
- `cloture_par_rh_id: current user`.

It does not write a closure date or history row. It accepts an optional `commentaire_cloture` only to echo whether one was received; the comment is not persisted.

## Archive

`POST /api/dossiers-explicatifs/[id]/archive` accepts only `A_ARCHIVER` and writes:

- `statut: ARCHIVE`;
- `date_archivage: now`;
- `archive_par_rh_id: current user`.

Archive is a manual transition. The archive queue page loads the dossier collection and presents pending archive records. Archive does not delete database rows or files and does not create history.

### Archive list: fault-type column and filter

`/dossiers-explicatifs/a-archiver` (`app/dossiers-explicatifs/a-archiver/page.jsx`) displays a `نوع المخالفة` column and a fault-type filter for the already-archived list. Both reuse existing data with no schema or API change:

- the column reads `dossier.type_faute` from the same `GET /api/dossiers-explicatifs` response already used to build the list (which already included `type_faute`);
- the filter options come from `GET /api/type-faute` (the same referential endpoint used elsewhere), not a hardcoded list;
- filtering is client-side, composed with the page's other existing filters (search, service, hospital, date range) as an intersection — selecting a fault type narrows within whatever the other filters already selected, it does not replace them;
- a deactivated (`actif: false`) `TypeFaute` still displays correctly by name, since `TypeFaute` rows are never hard-deleted while referenced (`onDelete: Restrict`) — only ever deactivated.

## Cancellation

`POST /api/dossiers-explicatifs/[id]/annuler` requires non-empty `motif_annulation`.

It rejects only `ARCHIVE` and `ANNULE`, meaning it can cancel active dossiers, `A_ARCHIVER`, and historical `CLOTURE` records. It atomically:

- writes `statut: ANNULE` and the reason;
- creates a `DossierHistory` row with action `ANNULATION`, old/new status, description, and actor.

The UI hides ordinary actions for a cancelled dossier, but not every backend terminal-status array includes `ANNULE`.

## Business/status transition table

### Forward path

| From | Action | To |
|---|---|---|
| creation | Create dossier | `ENREGISTRE` |
| `ENREGISTRE` | Generate initial documents | `DOCUMENTS_INITIAUX_GENERES` |
| `DOCUMENTS_INITIAUX_GENERES` | Register notification | `NOTIFIE` |
| `NOTIFIE` | Register response | `REPONSE_RECUE` |
| `REPONSE_RECUE` | Evaluate convincing | `REPONSE_CONVAINCANTE` |
| `REPONSE_RECUE` | Evaluate non-convincing | `REPONSE_NON_CONVAINCANTE` |
| `REPONSE_NON_CONVAINCANTE` | Upload procedure document | `PROCEDURE_SUIVANTE_GENEREE` |
| `REPONSE_CONVAINCANTE` | Close | `A_ARCHIVER` |
| `PROCEDURE_SUIVANTE_GENEREE` | Close | `A_ARCHIVER` |
| `A_ARCHIVER` | Archive | `ARCHIVE` |

### Corrections and alternate transitions

| Current status | Allowed operation | Resulting status |
|---|---|---|
| `NOTIFIE` through `PROCEDURE_SUIVANTE_GENEREE` as listed above | Correct notification | unchanged |
| `REPONSE_RECUE` through `PROCEDURE_SUIVANTE_GENEREE` as listed above | Correct response | unchanged |
| either decision status or `PROCEDURE_SUIVANTE_GENEREE` | Re-evaluate | selected decision status |
| any status except `ARCHIVE`/`ANNULE` | Cancel | `ANNULE` |
| non-final status, including currently `ANNULE` due a gap | Patch supplemental metadata | unchanged |
| `REPONSE_NON_CONVAINCANTE` or `PROCEDURE_SUIVANTE_GENEREE` only | Upload/replace procedure document (normal workflow) | `PROCEDURE_SUIVANTE_GENEREE` |
| `REPONSE_NON_CONVAINCANTE` or `PROCEDURE_SUIVANTE_GENEREE` only | Generate/regenerate procedure document (retained endpoint, not called by any UI path) | `PROCEDURE_SUIVANTE_GENEREE` |

## Five-step UI representation

The detail page maps database statuses to five display steps:

| UI step | Label | Mapped statuses |
|---:|---|---|
| 0 | تسجيل الملف | `ENREGISTRE`; `ANNULE` is also mapped here for rendering |
| 1 | التبليغ | `DOCUMENTS_INITIAUX_GENERES` |
| 2 | الجواب والتقييم | `NOTIFIE`, `REPONSE_RECUE` |
| 3 | المسطرة التأديبية | `REPONSE_NON_CONVAINCANTE` |
| 4 | الإغلاق | `REPONSE_CONVAINCANTE`, `PROCEDURE_SUIVANTE_GENEREE`, `CLOTURE`, `A_ARCHIVER`, `ARCHIVE` |

The step index represents the UI phase, not a complete status machine. Historical `BROUILLON`, `EN_ATTENTE_REPONSE`, and `EN_EVALUATION` are absent from this mapping and fall back to step zero.

`components/dossiers-explicatifs/WorkflowStepper.jsx` renders these five steps with three visual states: completed (emerald), current (blue), upcoming (neutral slate) — geometry, click behavior, and step logic are unchanged from prior versions; only the color/weight tokens were strengthened for contrast. The dossier detail page's top action buttons (`إغلاق الملف`, `إلغاء الملف`, `رجوع`) follow the same primary/destructive/navigation color hierarchy described in [UI system](ui-system.md#buttons). Neither change altered any status transition, permission check, or API call.

## Documents and downloads

Individual download:

- `GET /api/dossiers-explicatifs/[id]/documents/[documentId]/download`
- verifies both IDs and dossier ownership;
- resolves only allowlisted public paths;
- reads and returns file content with a sanitized filename.

ZIP download:

- `GET /api/dossiers-explicatifs/[id]/documents/download-all`
- includes every document whose stored path resolves to an existing allowlisted file;
- silently skips invalid/missing files;
- de-duplicates filenames;
- builds the ZIP in memory with `pizzip`;
- returns 404 when no file can be included.

The shared allowlist in `lib/dossiers-explicatifs/documentPath.js` (`ALLOWED_PREFIXES`) includes `/uploads/procedures/` (both `/`-prefixed and bare forms), alongside `generated`, `proofs`, `responses`, `templates`, and `correspondances`. Both download endpoints use this same allowlist, so manually uploaded (`TELEVERSE`) `procedure_suivante` documents download individually and appear in the ZIP exactly like every other document category — this was verified end-to-end (upload, single download, ZIP contents) against a throwaway test dossier before this behavior shipped.

Both endpoints allow authenticated readers. Direct URLs under `public/uploads` are also covered by the current middleware matcher.

## Role restrictions

All dossier reads require authentication. Dossier mutations call `rejectIfLecteur()` and are intended to reject `LECTEUR_RH` with 403. The page also hides mutation controls from readers. Role information in route handlers comes from the JWT and can be stale; see [Authentication and authorization](auth-authorization.md).

## History behavior

`DossierHistory` is not a general audit trail in the current implementation. Creation, generation, notification, response, evaluation, procedure, closure, and archive do not write history. Cancellation does. The dossier detail GET does not include `historique`, and the UI does not display a complete audit timeline.

## Terminal-state enforcement gaps

- `ANNULE` is omitted from the supplemental-metadata PATCH final list.
- `update-procedure-document` uses an explicit two-status allowlist (`REPONSE_NON_CONVAINCANTE`, `PROCEDURE_SUIVANTE_GENEREE`) rather than a blocklist, so it does not carry forward the historical `ANNULE` gap that affected it before the manual-upload workflow.
- Cancellation is allowed from `A_ARCHIVER` and historical `CLOTURE`, not only active statuses.
- Terminal rules are duplicated across handlers rather than centralized.
- Re-evaluation from `PROCEDURE_SUIVANTE_GENEREE` can leave a procedure document attached after switching to a convincing outcome.
- Archived dossiers are protected by the main workflow guards, but there is no single domain-level write barrier.
