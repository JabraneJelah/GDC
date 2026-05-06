# PROJECT_CONTEXT.md

This file is the single source of truth for this application. Future AI chats and developers should read this document before making architecture, database, workflow, UI, or deployment changes.

Last generated from the real codebase on 2026-05-06.

---

## 1. Project Overview

### Application Identity

The project is `gestion-conges-professeurs`, an internal RH administration application for a hospital/public institution context. It is built for RH staff, not for professors or public users.

The application currently covers:

| Domain | Purpose |
|---|---|
| RH users | Internal RH authentication and account management. |
| Professeurs | Staff/professor identity records with referential links. |
| Conges | Leave registration, decision documents, and leave balance tracking. |
| Soldes de conge | Annual leave balance storage and import/export workflows. |
| Referentials | Parametrable lists such as services, grades, hospitals, specialties, titles, categories, leave types, public holidays, and fault types. |
| Dossiers explicatifs | Disciplinary/explanatory dossier workflow with document generation, uploads, answer evaluation, closure, and archive lifecycle. |
| Document templates | DOCX/PDF template registry tied to fault types and dossier usages. |
| Dashboard | RH summary views and leave history statistics. |

### Business Context

This is an Arabic-first/French-codebase internal admin tool. The UI labels are primarily Arabic and RTL. The database and API naming are mostly French. The domain is RH operations inside a hospital/public establishment.

The core philosophy is not self-service. Professors do not log in. RH users manually create records, upload documents, register dates, and drive workflows based on paper/administrative procedures.

### Main Business Goals

1. Provide a reliable internal RH dashboard for managing professors and administrative records.
2. Preserve institutional records and avoid data loss.
3. Make referentials parametrable so RH can adapt the system without code changes.
4. Support disciplinary dossier workflows from creation to archive.
5. Track generated and uploaded documents in a consistent document registry.
6. Keep production migration/deployment safe by blocking destructive database changes unless explicitly overridden.

---

## 2. Tech Stack

### Frontend

| Item | Implementation |
|---|---|
| Framework | Next.js `16.0.10` App Router |
| UI runtime | React `19.2.1` |
| Styling | Tailwind CSS v4 through `@tailwindcss/postcss` |
| Component base | shadcn-style primitives in `components/ui` |
| Icons | `lucide-react` |
| Forms | Mostly local React state; `react-hook-form` and `zod` exist but are not consistently used across pages |
| RTL | Page-level `dir="rtl"` plus global CSS font override for `[dir="rtl"]` |
| Fonts | Inter for Latin/default; IBM Plex Sans Arabic for RTL Arabic content |

### Backend

| Item | Implementation |
|---|---|
| API style | Next.js App Router route handlers under `app/api/**/route.js` |
| Auth | JWT in HTTP-only cookie `auth_token` |
| Password hashing | `bcryptjs` |
| File handling | Node runtime, `fs/promises`, local `public/uploads/**` storage |
| Document generation | `pizzip` + `docxtemplater` for DOCX generation |
| Excel | `xlsx` for solde import/export workflows |

### Database and ORM

| Item | Implementation |
|---|---|
| Database | PostgreSQL 16 Alpine in Docker Compose |
| ORM | Prisma `7.2.0` |
| Adapter | `@prisma/adapter-pg` via `PrismaPg` |
| Schema | `prisma/schema.prisma` |
| Migrations | `prisma/migrations/**/migration.sql` |
| Prisma config | `prisma.config.js` loads `DATABASE_URL` from env |

### Deployment and Containerization

| Item | Implementation |
|---|---|
| Dockerfile | Multi-stage Node 20 Alpine build, Next standalone output |
| Compose DB | `postgres:16-alpine`, container `conge_postgres`, host port `5433` |
| Compose app | container `conge_app`, host port `3001`, app port `3000` |
| Persistent volumes | `postgres_data`, `uploads_data`, `backups_data` |
| Startup command | `docker/entrypoint.sh` |
| Migration deploy | `npx prisma migrate deploy` at container startup |
| Migration guard | `docker/scan-pending-migrations.cjs` scans pending SQL for destructive patterns |
| Backup helper | `docker/restore-backup.sh` restores pg_dump SQL manually |

---

## 3. Folder Structure

Important project structure:

```text
GDC-main/
├── app/
│   ├── api/
│   │   ├── auth/                         # Login/logout/me/profile/password endpoints
│   │   ├── conges/                       # Leave CRUD, upload, decision documents
│   │   ├── dashboard/                    # Stats and leave history endpoints
│   │   ├── document-template/            # Template list/create/update/delete/upload
│   │   ├── dossiers-explicatifs/         # Dossier workflow APIs
│   │   ├── professeurs/                  # Professor identity APIs
│   │   ├── soldes/                       # Balance bulk-add/import/export APIs
│   │   └── referential route groups      # services, grades, hopitaux, etc.
│   ├── conges/
│   ├── dashboard/
│   ├── document-templates/
│   ├── dossiers-explicatifs/
│   │   ├── page.jsx                      # Main dossier list
│   │   ├── nouveau/page.jsx              # Dossier creation UI
│   │   ├── a-archiver/page.jsx           # Manual archive queue UI
│   │   └── [id]/page.jsx                 # Dossier detail workflow UI
│   ├── professeurs/
│   ├── referential pages                 # services, grades, hopitaux, etc.
│   ├── layout.jsx                        # Root document/layout and font wiring
│   └── globals.css                       # Tailwind v4 tokens and global RTL font strategy
├── components/
│   ├── ui/                               # shadcn-like UI primitives
│   ├── layout/                           # Sidebar, Header, Footer, PageShell
│   └── dossiers-explicatifs/             # Dossier-specific reusable UI components
├── docker/
│   ├── entrypoint.sh                     # Production startup pipeline
│   ├── scan-pending-migrations.cjs       # Destructive migration detector
│   └── restore-backup.sh                 # Manual SQL restore helper
├── frontend/src/lib/
│   └── dossierStatus.ts                  # Dossier Arabic labels/action labels/status colors
├── lib/
│   ├── auth.js                           # JWT, bcrypt, cookie helpers
│   ├── prisma.js                         # PrismaPg adapter and global PrismaClient reuse
│   ├── solde-expiration.js
│   └── working-days.js
├── prisma/
│   ├── schema.prisma                     # Database schema
│   ├── seed.js                           # Seed types, admin user, fault types, templates
│   └── migrations/                       # SQL migration history
├── public/uploads/
│   ├── conges/
│   ├── decisions/
│   ├── generated/
│   ├── proofs/
│   ├── responses/
│   └── templates/
├── Dockerfile
├── docker-compose.yml
├── middleware.js
├── next.config.js
├── package.json
└── prisma.config.js
```

### Important Notes About Structure

- There is a reusable `components/layout/PageShell.jsx`, but many pages still define local `PageShell` functions. This duplication is current technical debt.
- The dossier pages recently moved to full-width admin layout wrappers using `w-full max-w-none` rather than centered `max-w-7xl`.
- `frontend/src/lib/dossierStatus.ts` is used by app pages through the alias import `@/frontend/src/lib/dossierStatus`.
- Uploaded and generated files are stored under `public/uploads/**`; Docker persists this directory via the `uploads_data` volume.

---

## 4. Database Architecture

### Prisma Philosophy

The schema is Prisma-first with explicit model names in French and database table names mapped with `@@map`. Relations are modeled with a mix of strict and nullable foreign keys.

Key points:

- Use Prisma migrations, not ad hoc production DDL.
- Use `prisma migrate deploy` in production.
- Do not use `prisma db push` in production.
- Do not use `prisma migrate reset` against real data.
- Prefer additive migrations for production.
- Avoid required columns without defaults on populated tables.
- Avoid destructive changes unless there is a dedicated preservation/backup/migration plan.

### Database Models

#### RH Users

`UtilisateurRH` maps to `utilisateurs_rh`.

Important fields:

| Field | Purpose |
|---|---|
| `id String @id @default(uuid())` | Primary RH user ID |
| `email String? @unique` | Optional unique email |
| `username String? @unique` | Login username |
| `mot_de_passe String` | bcrypt hash, with legacy plain-text upgrade during login |
| `nom_complet String` | Display name |
| `actif Boolean @default(true)` | Soft activation flag |

Important reverse relations:

- `conges_crees`
- `document_templates_crees`
- `dossiers_explicatifs_crees`
- `dossiers_explicatifs_decides`
- `dossiers_explicatifs_clotures`
- `dossiers_explicatifs_archives`
- `dossiers_documents_crees`
- `dossiers_historiques_effectues`

#### Dossier Core

`DossierExplicatif` maps to `dossiers_explicatifs`.

Important fields:

| Field | Required? | Purpose |
|---|---:|---|
| `reference` | Yes | Unique generated reference like `DOS-YYYYMMDD-XXXXXX` |
| `nom_complet`, `matricule`, `profil`, `service` | Yes | Snapshot of professor identity at dossier creation |
| `professeur_id` | No | Optional relation to live professor record |
| `date_faute` | Yes | Fault date |
| `details` | No | Free text |
| `statut` | Yes | Workflow state |
| `decision_reponse` | No | Answer evaluation decision |
| `type_procedure_selectionne` | No | Procedure type after non-convincing response |
| `date_notification` | No | Notification date |
| `date_limite_reponse` | No | Present in schema but not currently central in workflow code |
| `date_reponse_recue` | No | Response receipt date |
| `en_retard` | Yes, default false | Late flag |
| `cree_par_rh_id` | Yes | Creator RH user |
| `decision_par_rh_id` | No | RH user who evaluated response |
| `cloture_par_rh_id` | No | RH user who closed/finalized dossier |
| `date_archivage` | No | Manual archive timestamp |
| `archive_par_rh_id` | No | RH user who archived |
| `template_procedure_id` | No | Selected follow-up procedure template |

#### Documents

`DossierDocument` maps to `dossiers_documents`.

Documents can be generated (`GENERE`) or uploaded (`TELEVERSE`). They are tied to one dossier and optionally to one template.

Document categories currently used:

| Category | Meaning |
|---|---|
| `lettre_explicative` | Initial explanatory letter |
| `bordereau_notification` | Notification/bordereau document |
| `preuve_notification` | Uploaded notification proof |
| `reponse_agent` | Uploaded response document |
| `procedure_suivante` | Follow-up procedure document |

Note: initial generation code does not currently set `categorie`, even though UI expects category values for filtering. This is a known limitation.

#### Document Templates

`DocumentTemplate` maps to `documents_templates`.

Templates are tied to `TypeFaute` and optionally to `TemplateUsage`:

- `LETTRE_EXPLICATIVE`
- `BORDEREAU_NOTIFICATION`
- `AVERTISSEMENT`
- `RETENUE`

Templates are soft-enabled/disabled through `actif`, not removed as the primary workflow.

#### Referentials

Referential models:

- `TypeFaute`
- `CategoriePersonnel`
- `Specialite`
- `Titre`
- `Service`
- `Hopital`
- `Grade`
- `TypeConge`
- `JourFerie`

These allow the institution to adapt data values without hard-coding all administrative vocabulary.

#### Leave Domain

Main leave models:

- `Professeur`
- `Conge`
- `SoldeConge`
- `TypeConge`
- `JourFerie`

The leave domain predates the dossier-explicatif module and remains a major module in the app.

### Referential Integrity Strategy

The schema uses:

| Pattern | Where | Rationale |
|---|---|---|
| `onDelete: Restrict` | Required business owners like dossier creator and fault type | Prevent deleting records that are required to interpret historical data. |
| `onDelete: SetNull` | Optional RH actions, optional templates, optional professor/service/hospital/grade links | Preserve dossier/history if optional referenced records are removed. |
| `onDelete: Cascade` | Dossier to documents/history; professor to leave balances/leaves | Child data depends on parent lifecycle. Use cautiously. |

### Nullability Strategy

Production safety prefers nullable additive fields. The archive lifecycle was implemented this way:

```prisma
date_archivage    DateTime?
archive_par_rh_id String?
archive_par_rh    UtilisateurRH? @relation("DossierArchiveParRH", fields: [archive_par_rh_id], references: [id], onDelete: SetNull)
```

This keeps existing dossiers valid and avoids backfilling requirements.

### Migration Safety Rules

The Docker startup path includes a pending migration SQL scanner:

`docker/scan-pending-migrations.cjs`

It blocks pending migrations containing:

- `DROP TABLE`
- `DROP COLUMN`
- `TRUNCATE`
- `DROP SCHEMA`
- `DROP DATABASE`
- `CREATE TABLE ... AS SELECT`
- `ALTER COLUMN ... TYPE`
- `DELETE FROM` without `WHERE`
- Table recreation patterns (`DROP TABLE` then `CREATE TABLE` same table)

The guard is skipped only when there are zero finished migrations in a fresh database bootstrap. After baseline exists, pending migrations are scanned.

Override exists but is dangerous:

```env
ALLOW_DESTRUCTIVE_MIGRATIONS=true
```

Use only with explicit intent, backups, and a rollback plan.

### Archive Strategy

Archive is a state transition, not data deletion.

Lifecycle:

```text
REPONSE_CONVAINCANTE
  └─ close → A_ARCHIVER

PROCEDURE_SUIVANTE_GENEREE
  └─ close → A_ARCHIVER

A_ARCHIVER
  └─ manual archive → ARCHIVE
```

Rules:

- `CLOTURE` remains a valid historical status.
- New closure moves to `A_ARCHIVER`.
- Manual archive moves only `A_ARCHIVER` to `ARCHIVE`.
- `ARCHIVE` is the final/read-only state conceptually.
- Archive metadata is nullable and set only by the archive endpoint.

### Audit/History Philosophy

The schema includes `DossierHistory`, but current dossier route handlers do not consistently write history records. This is an explicit gap. Future work should add history rows inside the same transaction as workflow state changes.

---

## 5. Dossiers Explicatifs Module

### Module Purpose

The dossier-explicatif module manages disciplinary/explanatory administrative dossiers. It combines:

- professor identity snapshot
- fault type
- generated templates
- proof/response uploads
- RH evaluation
- follow-up procedure generation
- closure
- manual archive

### Status Enum

`StatutDossierExplicatif` currently contains:

| Status | Meaning |
|---|---|
| `ENREGISTRE` | Dossier created/registered. |
| `DOCUMENTS_INITIAUX_GENERES` | Initial documents generated. |
| `BROUILLON` | Historical/default schema status; not central in current UI creation flow. |
| `NOTIFIE` | Notification registered. |
| `EN_ATTENTE_REPONSE` | Present in enum; not central in current UI/API flow. |
| `REPONSE_RECUE` | Response received/uploaded. |
| `REPONSE_CONVAINCANTE` | Response evaluated as convincing. |
| `REPONSE_NON_CONVAINCANTE` | Response evaluated as not convincing. |
| `PROCEDURE_SUIVANTE_GENEREE` | Follow-up procedure generated/registered. |
| `EN_EVALUATION` | Present in enum; not central in current UI/API flow. |
| `CLOTURE` | Historical closed status. Existing records remain valid. |
| `A_ARCHIVER` | Closed/finalized and waiting manual archive. |
| `ARCHIVE` | Archived final state. |

Arabic labels live in `frontend/src/lib/dossierStatus.ts`.

### Current Workflow

```text
Create dossier
  POST /api/dossiers-explicatifs
  → ENREGISTRE

Generate initial documents
  POST /api/dossiers-explicatifs/[id]/generate-initial-documents
  ENREGISTRE → DOCUMENTS_INITIAUX_GENERES

Register notification proof
  POST /api/dossiers-explicatifs/[id]/register-notification
  DOCUMENTS_INITIAUX_GENERES → NOTIFIE

Register response document
  POST /api/dossiers-explicatifs/[id]/register-response
  NOTIFIE → REPONSE_RECUE

Evaluate response
  POST /api/dossiers-explicatifs/[id]/evaluate-response
  REPONSE_RECUE → REPONSE_CONVAINCANTE
  OR
  REPONSE_RECUE → REPONSE_NON_CONVAINCANTE

If response is not convincing:
  POST /api/dossiers-explicatifs/[id]/generate-procedure
  REPONSE_NON_CONVAINCANTE → PROCEDURE_SUIVANTE_GENEREE

Close/finalize:
  POST /api/dossiers-explicatifs/[id]/close-dossier
  REPONSE_CONVAINCANTE → A_ARCHIVER
  PROCEDURE_SUIVANTE_GENEREE → A_ARCHIVER

Archive manually:
  POST /api/dossiers-explicatifs/[id]/archive
  A_ARCHIVER → ARCHIVE
```

### Dossier Creation

Route: `app/api/dossiers-explicatifs/route.js`

Creation requires:

- authenticated RH user
- `professeur_id`
- `date_faute`
- `type_faute_id`

The route fetches:

- selected `TypeFaute`
- current `UtilisateurRH`
- selected `Professeur`

It creates snapshots:

- full name from professor `prenom` + `nom`
- matricule from `ppr`
- profile from grade/title/category
- service from professor service

Reference format:

```text
DOS-YYYYMMDD-RANDOM6
```

It attempts unique reference generation up to 5 times.

### Initial Document Generation

Route: `app/api/dossiers-explicatifs/[id]/generate-initial-documents/route.js`

Allowed only from:

```text
ENREGISTRE
```

Template usage filter:

```js
['LETTRE_EXPLICATIVE', 'BORDEREAU_NOTIFICATION']
```

Implementation details:

- Loads active templates tied to the dossier's `type_faute_id`.
- Uses `pizzip` and `docxtemplater`.
- Reads templates from `public` through safe path resolution.
- Writes generated DOCX files to `public/uploads/generated`.
- Uses `writeFile(..., { flag: 'wx' })` to avoid overwriting existing files.
- Creates `DossierDocument` records.
- Updates dossier status to `DOCUMENTS_INITIAUX_GENERES` in a Prisma transaction.

Known gap:

- The generated documents currently do not set the `categorie` field, even though UI components use categories to group documents.

### Notification Upload

Route: `app/api/dossiers-explicatifs/[id]/register-notification/route.js`

Allowed only from:

```text
DOCUMENTS_INITIAUX_GENERES
```

Requires:

- `date_notification`
- uploaded proof file

Allowed MIME types:

- `application/pdf`
- `image/jpeg`
- `image/png`

Storage:

```text
public/uploads/proofs/
```

Creates `DossierDocument` with:

- `origine: TELEVERSE`
- `categorie: preuve_notification`
- RH creator ID

Then updates:

- `date_notification`
- `statut: NOTIFIE`

### Response Upload

Route: `app/api/dossiers-explicatifs/[id]/register-response/route.js`

Allowed only from:

```text
NOTIFIE
```

Requires:

- `date_reponse`
- uploaded response document

Allowed MIME types:

- PDF
- JPG
- PNG
- DOCX

Storage:

```text
public/uploads/responses/
```

Creates `DossierDocument` with:

- `origine: TELEVERSE`
- `categorie: reponse_agent`

Then updates:

- `date_reponse_recue`
- `statut: REPONSE_RECUE`

### Response Evaluation

Route: `app/api/dossiers-explicatifs/[id]/evaluate-response/route.js`

Allowed only from:

```text
REPONSE_RECUE
```

Allowed decisions:

| Decision | New status |
|---|---|
| `CONVAINCANTE` | `REPONSE_CONVAINCANTE` |
| `NON_CONVAINCANTE` | `REPONSE_NON_CONVAINCANTE` |

Sets:

- `decision_reponse`
- `decision_par_rh_id`
- `statut`

Note: The route accepts `commentaire` and echoes it in response text but does not persist the comment in the current schema.

### Procedure Generation

Route: `app/api/dossiers-explicatifs/[id]/generate-procedure/route.js`

Allowed only from:

```text
REPONSE_NON_CONVAINCANTE
```

Allowed procedure types:

- `AVERTISSEMENT`
- `RETENUE`

Validation:

- `template_id` must be UUID.
- Template must exist.
- Template must be active.
- Template must match dossier `type_faute_id`.
- Template `usage` must match selected procedure type.
- No previous procedure document should exist.

Current implementation:

- Creates a `DossierDocument` with `categorie: procedure_suivante`.
- Uses `pending://procedure/template/{templateId}/dossier/{dossierId}` as placeholder path.
- Updates dossier to `PROCEDURE_SUIVANTE_GENEREE`.

Known gap:

- The procedure document is not actually generated as a DOCX/PDF yet. It is registered as a pending placeholder.

### Closure Flow

Route: `app/api/dossiers-explicatifs/[id]/close-dossier/route.js`

Allowed only from:

- `REPONSE_CONVAINCANTE`
- `PROCEDURE_SUIVANTE_GENEREE`

Rejects:

- `CLOTURE`
- `A_ARCHIVER`
- `ARCHIVE`
- every non-closable status

Updates:

```js
{
  statut: 'A_ARCHIVER',
  cloture_par_rh_id: currentUser.userId
}
```

Important:

- Does not set archive fields.
- Does not set `date_archivage`.
- Does not set `archive_par_rh_id`.
- There is no `date_cloture` field in the Prisma schema, although UI currently references `dossier.date_cloture`. This is technical debt.

### Archive Flow

Route: `app/api/dossiers-explicatifs/[id]/archive/route.js`

Allowed only from:

```text
A_ARCHIVER
```

Rejects:

- invalid UUID
- missing dossier
- already `ARCHIVE`
- any status other than `A_ARCHIVER`

Updates:

```js
{
  statut: 'ARCHIVE',
  date_archivage: new Date(),
  archive_par_rh_id: currentUser.userId
}
```

Returns:

- success message
- dossier ID
- new status
- `date_archivage`

### Dossier UI

Main files:

- `app/dossiers-explicatifs/page.jsx`
- `app/dossiers-explicatifs/nouveau/page.jsx`
- `app/dossiers-explicatifs/[id]/page.jsx`
- `app/dossiers-explicatifs/a-archiver/page.jsx`
- `components/dossiers-explicatifs/**`

Detail page workflow step labels:

```text
تسجيل الملف
إنشاء الوثائق
التبليغ
الجواب
التقييم
المسطرة
الإغلاق
```

`statusStepIndex` maps statuses to workflow step indexes. `A_ARCHIVER`, `ARCHIVE`, and historical `CLOTURE` all map to the final step.

The archive queue page (`/dossiers-explicatifs/a-archiver`) lists dossiers in `A_ARCHIVER` and calls the archive endpoint manually.

---

## 6. Referential System

### Purpose

The application is parametrable. Administrative values are not meant to be hard-coded in workflows when they can be managed as referentials.

### Fault Types: `TypeFaute`

Fault types drive dossier classification and template selection.

Seeded fault codes include:

- `RETARD`
- `ABSENCE_NON_JUSTIFIEE`
- `DEPART_AVANT_HEURE`
- `NON_RESPECT_PAUSE`
- `MAUVAISE_CONDUITE_PATIENTS`
- `NON_RESPECT_COLLEGUES`
- `ALTERCATION_TRAVAIL`
- `NON_RESPECT_ETHIQUE`
- `TENUE_PROFESSIONNELLE`
- `ABANDON_POSTE`

`TypeFaute.actif` allows disabling use without deleting historical data.

### Document Templates

Templates are tied to a fault type and usage.

Template use cases:

| Usage | Meaning |
|---|---|
| `LETTRE_EXPLICATIVE` | Initial explanatory letter |
| `BORDEREAU_NOTIFICATION` | Notification/bordereau |
| `AVERTISSEMENT` | Warning follow-up |
| `RETENUE` | Salary/disciplinary deduction follow-up |

Uploads use:

```text
public/uploads/templates/
```

The upload route only accepts `.docx` by filename. Template records store:

- identifier
- name
- description
- `format_source`
- usage
- file path
- active flag
- type faute relation

### Personnel Referentials

The professor identity system references:

- `CategoriePersonnel`
- `Specialite`
- `Titre`
- `Service`
- `Hopital`
- `Grade`

These referentials keep professor data normalized while allowing UI filters and reporting.

### Leave Referentials

Leave management uses:

- `TypeConge`
- `JourFerie`

`TypeConge.document_obligatoire` controls whether supporting documents are required for leave types.

---

## 7. UI/UX Philosophy

### Arabic-First Admin UI

The app is operational, not marketing-oriented. The UI should feel like a professional RH dashboard:

- dense but readable
- full-width admin surfaces
- RTL-first for Arabic content
- consistent cards/tables/badges
- clear workflow steps
- minimal decorative flourishes

### RTL Rules

Current strategy:

- Page content often wraps with `dir="rtl"`.
- Global CSS applies IBM Plex Sans Arabic to `[dir="rtl"]` and descendants.
- Tables use `text-right`.
- Latin/technical identifiers use `dir="ltr"` when needed, especially references and codes.

Rules:

- Preserve RTL on Arabic pages.
- Do not introduce LTR layout assumptions.
- References, IDs, and filenames should remain `dir="ltr"` for readability.
- Icons should align with the Arabic reading flow.

### Typography

Fonts:

- Latin/default: Inter
- Arabic: IBM Plex Sans Arabic

Admin text is generally:

- `text-sm` for table cells and body content
- `text-xs` for metadata, badges, and helper text
- `text-lg` or `text-2xl` for section/page headers

Avoid oversized landing-page typography inside admin workflows.

### Layout Philosophy

The app should use full available dashboard width, not centered website containers.

Preferred page wrapper:

```jsx
<div className="flex min-h-screen">
  <Sidebar />
  <div className="flex flex-1 flex-col lg:ml-0">
    <main className="flex-1 bg-[#F8FAFC] pt-16 lg:pt-4">
      <div className="w-full max-w-none px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        {children}
      </div>
    </main>
    <Footer />
  </div>
</div>
```

Avoid page-level:

```text
mx-auto max-w-*
container mx-auto
```

Exceptions:

- dialogs
- empty states
- small search controls
- intentionally constrained form panels

### Background and Color Philosophy

Common backgrounds:

- App surface: `#F8FAFC` or `#FBFCFD`
- Cards: white
- Table headers: `#F1F5F9`
- Borders: slate-200
- Muted text: slate-500/600
- Primary action: blue
- Success: green
- Warning/archive: amber
- Danger: red/rose

The design avoids heavy saturated backgrounds. Color communicates state, not decoration.

### Cards

Cards are for:

- grouped administrative panels
- workflow sections
- table containers
- dialogs

Cards use:

- `rounded-2xl`
- `border border-slate-200`
- `bg-white`
- `shadow-sm`

Do not nest decorative cards unnecessarily.

### Table UX Rules

Tables should be full-width admin surfaces:

```jsx
<div className="w-full overflow-x-auto">
  <table className="w-full min-w-[1200px]">
```

Cell spacing:

```jsx
<th className="px-4 py-3 text-sm font-semibold">
<td className="px-4 py-3 text-sm">
```

Table philosophy:

- use full available screen width
- avoid unnecessary horizontal scroll caused by centered page containers
- keep horizontal scroll only as a responsive fallback
- preserve RTL alignment
- keep references/codes readable with `dir="ltr"`
- use subtle row hover (`hover:bg-[#F8FAFC]`)

### Badges

Badge colors map semantic states:

| Variant | Use |
|---|---|
| `success` | completed, convincing, active, archived |
| `warning` | waiting, pending archive, response received |
| `danger` | errors, non-convincing |
| `info` | generated/in progress informational states |
| `neutral` | inactive/default |

`components/dossiers-explicatifs/StatusBadge.jsx` is a simple reusable badge component.

### Sidebar Philosophy

`components/layout/sidebar.jsx` is the primary navigation.

Features:

- fixed right sidebar on desktop (`w-64`)
- slide-in mobile menu
- Arabic labels
- active route highlighting
- expandable referential group
- logout action
- profile link

The sidebar is the anchor of the admin dashboard. Future pages should use it consistently.

### Header Philosophy

`components/layout/Header.jsx` exists but is not used by every local page shell. It provides:

- sticky desktop header
- placeholder search
- notification/settings icons
- user initials from `/api/auth/me`

Future work should consolidate page shells around the shared layout components.

### Step Workflow UX Philosophy

The dossier detail page uses:

- `WorkflowStepper`
- `StepActionPanel`

Principles:

- show the administrative sequence clearly
- completed steps are green
- current step is blue
- future steps are muted
- completed/current steps are clickable for review
- when viewing old steps, offer a return-to-current control

---

## 8. Component Philosophy

### UI Primitives

`components/ui/**` contains shadcn-style primitives:

- Button
- Input
- Label
- Select
- Dialog
- Card
- Table
- Badge
- Calendar
- Combobox
- Pagination

These should remain generic and not know dossier-specific business rules.

### Dossier Components

| Component | Purpose |
|---|---|
| `AppCard` | Shared white card with optional title/subtitle/icon |
| `InfoGrid` | Compact label/value grid |
| `WorkflowStepper` | Horizontal RTL workflow display |
| `StepActionPanel` | Current/previous step content wrapper |
| `DocumentsTable` | Dossier document table with download links |
| `UploadField` | Styled file input/drop area |
| `StatusBadge` | Semantic pill badge |

### Reusable Component Rules

- Keep business workflows in pages/routes, not in primitives.
- Keep visual conventions centralized when repeated.
- Do not fork a component just to adjust minor spacing; pass `className` or extend carefully.
- Avoid duplicating large layout patterns in every page; prefer shared PageShell over time.
- Preserve RTL and Arabic labels in dossier-specific components.

---

## 9. Deployment & Safety

### Docker Philosophy

The production image is built with a multi-stage Dockerfile:

1. `deps`: install dependencies with `npm ci`
2. `builder`: generate Prisma client and run `npm run build`
3. `runner`: copy Next standalone output, static assets, public assets, Prisma schema/migrations, and pruned production node_modules

The runner includes:

- PostgreSQL client tools (`pg_dump`, `psql`)
- `su-exec`
- Prisma CLI dependencies for `migrate deploy`

### Startup Safety Pipeline

`docker/entrypoint.sh`:

1. Ensures `/backups` exists and is writable by `nextjs`.
2. Drops root privileges using `su-exec`.
3. Validates required env:
   - `NODE_ENV`
   - `DATABASE_URL`
   - `JWT_SECRET`
4. In production, validates `JWT_SECRET` length and blocks placeholder-like secrets.
5. Optionally validates DB host with `EXPECTED_DB_HOST`.
6. Waits for DB TCP readiness.
7. Optionally runs `pg_dump` when `AUTO_BACKUP_BEFORE_MIGRATE=true`.
8. Scans pending migration SQL for destructive patterns.
9. Runs `npx prisma migrate deploy`.
10. Starts Next standalone server with `node server.js`.

### Backup Strategy

Automatic backup is optional:

```env
AUTO_BACKUP_BEFORE_MIGRATE=true
```

Backups are written to:

```text
/backups/backup_YYYY-MM-DD_HH-MM-SS.sql
```

Manual restore helper:

```bash
docker compose exec app restore-backup /backups/backup_YYYY-MM-DD_HH-MM-SS.sql
```

### Production Protection

Do not:

- run `prisma migrate reset`
- run `prisma db push`
- drop columns/tables casually
- make populated-table columns required without defaults
- move or split tables without a data migration plan
- remove enum values
- remove historical statuses
- delete uploaded files as part of schema changes

Prefer:

- additive schema changes
- nullable new fields
- `SetNull` for optional historical actors
- `Restrict` for required historical records
- explicit backups before migrations
- safe deploy through Docker entrypoint

---

## 10. Development Rules

Future AI agents and developers must follow these rules.

### Database Rules

1. Never make destructive Prisma changes without an explicit migration and backup strategy.
2. Never remove or rename enum values used by existing rows.
3. Never add required fields to populated tables unless they have safe defaults and are proven compatible.
4. Prefer nullable additive columns for lifecycle metadata.
5. Preserve historical statuses such as `CLOTURE`.
6. Prefer soft disabling (`actif=false`) over hard deletion for referentials.
7. Do not use `prisma db push` in production.
8. Do not use `prisma migrate reset` on real data.
9. Always run `prisma validate` after schema edits.
10. Always run `prisma format` after schema edits.
11. Review generated migration SQL before committing.

### API Rules

1. Require authentication for all operational RH routes.
2. Use strict UUID validation for dynamic IDs.
3. Validate current status before workflow transitions.
4. Reject duplicate state changes where the route is not idempotent.
5. Use transactions when creating documents and changing dossier status together.
6. Sanitize upload filenames.
7. Resolve filesystem paths against `public` and block path traversal.
8. Never expose arbitrary filesystem paths for download.
9. Keep archive manual; do not auto-archive on close.
10. Do not let `ARCHIVE` dossiers be modified by workflow actions.

### UI Rules

1. Preserve Arabic RTL.
2. Use full-width admin layout for operational table pages.
3. Do not center admin tables inside `max-w-*` page containers.
4. Use subtle dashboard colors, not marketing gradients.
5. Keep table headers and cells readable with `px-4 py-3 text-sm`.
6. Use badges for statuses.
7. Use lucide icons for actions and navigation.
8. Keep workflow steps visually consistent.
9. Keep dialogs constrained; do not make all modal content full-width.
10. Do not introduce business logic into generic UI primitives.

### Codebase Rules

1. Read existing patterns before editing.
2. Keep changes scoped.
3. Do not modify unrelated files.
4. Do not remove existing user/worktree changes unless explicitly asked.
5. Prefer reusable components when repeated UI patterns appear.
6. Keep comments useful and sparse.
7. Run `npm run build` for meaningful UI/API changes.

---

## 11. Current UI/UX State

### Recent Improvements

The following pages have been moved toward full-width admin dashboard layout:

- `/dossiers-explicatifs`
- `/dossiers-explicatifs/a-archiver`
- `/dossiers-explicatifs/[id]`
- `/document-templates`

These pages now use:

```text
w-full max-w-none
w-full overflow-x-auto
w-full min-w-[1200px]
```

The goal is to avoid a centered website feel and give RH users a more professional dashboard table experience.

### Current Dossier UI

The dossier module has:

- list page with filters
- creation page
- detail workflow page
- archive queue page
- reusable workflow components
- document table
- Arabic labels for statuses

### Current Template UI

The document templates page supports:

- list/search
- active/inactive counters
- create template dialog with DOCX upload
- edit template dialog
- delete action
- template usage badges
- full-width table layout

---

## 12. Known Problems / Technical Debt

This section is intentionally honest. Do not assume these items are already solved.

### Layout Duplication

Many pages define local `PageShell` components even though `components/layout/PageShell.jsx` exists. This causes drift in spacing, header usage, background color, and full-width behavior.

Recommended future refactor:

- move all admin pages to shared `PageShell`
- support optional header on/off
- enforce full-width `max-w-none` layout by default

### Dossier History Not Populated

`DossierHistory` exists in the schema but current workflow routes do not consistently create history rows. This weakens auditability.

Future fix:

- write history in the same transaction as every status transition
- include old status, new status, action, description, RH actor

### No `date_cloture` Field

The UI references `dossier.date_cloture`, but the Prisma schema does not define it. Closure currently stores only `cloture_par_rh_id` and status `A_ARCHIVER`.

Future fix options:

- add nullable `date_cloture DateTime?` safely
- set it in close route
- update UI to display it reliably

### Procedure Generation Is Placeholder-Based

`generate-procedure` creates a `pending://` document path. It does not currently generate an actual DOCX/PDF file.

Future fix:

- implement real generation for `AVERTISSEMENT` and `RETENUE`
- reuse safe path generation patterns from initial document generation
- update `DossierDocument.chemin_fichier` from pending to real public path

### Initial Generated Document Categories

Initial generation creates `DossierDocument` records but does not set `categorie`, while UI filters initial documents by categories `lettre_explicative` and `bordereau_notification`.

Future fix:

- map template usage to document category during initial generation

### Auth Inconsistency

Middleware protects most routes, but some API routes explicitly call `getCurrentUser()` and others rely on middleware. For example, document-template routes do not consistently call `getCurrentUser()`.

Future fix:

- define a standard route auth helper
- explicitly use it in all operational APIs

### Prisma Debug Logging

`lib/prisma.js` contains agent/debug logging attempts to `.cursor/debug.log`. This is not ideal production code.

Future fix:

- remove or replace with normal structured logging guarded by environment flags

### Seed Defaults Are Development-Oriented

The seed creates:

- admin user `admin`
- password `admin123`
- default fault types
- default leave types
- default document templates

Production deployments must change credentials and should treat seed behavior carefully.

### Archive Read-Only Enforcement Is Partial

Business rule says `ARCHIVE` is final/read-only. The archive transition exists, but not every route has explicit `ARCHIVE` rejection yet. Middleware/auth alone does not enforce read-only business behavior.

Future fix:

- every mutation route touching dossiers should reject `ARCHIVE`
- centralize status transition rules

---

## 13. Future Roadmap

### Short-Term

1. Consolidate all admin pages onto shared `PageShell`.
2. Add `date_cloture DateTime?` safely if closure date is required by UI/business.
3. Add DossierHistory writes for every workflow transition.
4. Enforce `ARCHIVE` read-only in all dossier mutation routes.
5. Fix initial document `categorie` creation.
6. Generate real follow-up procedure documents instead of `pending://` placeholders.
7. Standardize authentication checks in every API route.

### Medium-Term

1. Create a centralized dossier workflow state machine.
2. Add tests for valid/invalid status transitions.
3. Add document regeneration/retry for failed generation.
4. Add archive filters and reporting.
5. Add a full audit timeline on dossier detail page.
6. Add RBAC/permissions beyond simple active RH account.
7. Improve template variable validation before upload.
8. Add file integrity checks for uploaded/generated files.

### Long-Term

1. Formalize production backup/restore runbooks.
2. Add monitoring/health endpoints.
3. Add structured logs and request correlation IDs.
4. Add database-level retention/archive reporting.
5. Add automated UI regression checks for RTL layouts.
6. Add migration review CI that runs the destructive SQL scanner before merge.
7. Support institution-specific configuration without code changes.

---

## Appendix A: Key Commands

Development:

```bash
npm install
npm run dev
npm run build
```

Prisma:

```bash
npx prisma validate
npx prisma format
npx prisma migrate dev --name <name>
npx prisma migrate deploy
npm run db:seed
```

Docker:

```bash
docker compose up -d
docker compose logs app --tail 120
docker compose logs postgres --tail 120
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run db:seed
```

Backup restore:

```bash
docker compose exec app restore-backup /backups/backup_YYYY-MM-DD_HH-MM-SS.sql
```

---

## Appendix B: Critical Files

| File | Why it matters |
|---|---|
| `prisma/schema.prisma` | Source of truth for database models and relations |
| `prisma/migrations/**/migration.sql` | Actual database evolution history |
| `docker/entrypoint.sh` | Production startup and migration pipeline |
| `docker/scan-pending-migrations.cjs` | Destructive migration guard |
| `lib/auth.js` | JWT/password/cookie helpers |
| `lib/prisma.js` | Prisma client creation |
| `middleware.js` | Global route protection |
| `app/api/dossiers-explicatifs/**` | Dossier workflow backend |
| `app/dossiers-explicatifs/**` | Dossier workflow UI |
| `frontend/src/lib/dossierStatus.ts` | Dossier status Arabic labels/colors |
| `components/dossiers-explicatifs/**` | Reusable dossier UI pieces |
| `components/layout/sidebar.jsx` | Main admin navigation |
| `app/globals.css` | Tailwind theme and RTL font strategy |

---

## Appendix C: Dossier Status Transition Table

| From | Action | Endpoint | To |
|---|---|---|---|
| `ENREGISTRE` | Generate initial documents | `POST /api/dossiers-explicatifs/[id]/generate-initial-documents` | `DOCUMENTS_INITIAUX_GENERES` |
| `DOCUMENTS_INITIAUX_GENERES` | Register notification | `POST /api/dossiers-explicatifs/[id]/register-notification` | `NOTIFIE` |
| `NOTIFIE` | Register response | `POST /api/dossiers-explicatifs/[id]/register-response` | `REPONSE_RECUE` |
| `REPONSE_RECUE` | Evaluate convincing | `POST /api/dossiers-explicatifs/[id]/evaluate-response` | `REPONSE_CONVAINCANTE` |
| `REPONSE_RECUE` | Evaluate non-convincing | `POST /api/dossiers-explicatifs/[id]/evaluate-response` | `REPONSE_NON_CONVAINCANTE` |
| `REPONSE_NON_CONVAINCANTE` | Generate follow-up procedure | `POST /api/dossiers-explicatifs/[id]/generate-procedure` | `PROCEDURE_SUIVANTE_GENEREE` |
| `REPONSE_CONVAINCANTE` | Close/finalize | `POST /api/dossiers-explicatifs/[id]/close-dossier` | `A_ARCHIVER` |
| `PROCEDURE_SUIVANTE_GENEREE` | Close/finalize | `POST /api/dossiers-explicatifs/[id]/close-dossier` | `A_ARCHIVER` |
| `A_ARCHIVER` | Manual archive | `POST /api/dossiers-explicatifs/[id]/archive` | `ARCHIVE` |

---

## Appendix D: Environment Variables

Do not commit real secrets. The application expects at least:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `NODE_ENV` | `development` or `production` |
| `EXPECTED_DB_HOST` | Optional Docker startup guard |
| `ALLOW_DESTRUCTIVE_MIGRATIONS` | Dangerous override for migration scanner |
| `AUTO_BACKUP_BEFORE_MIGRATE` | Optional pg_dump before migration deploy |

Production `JWT_SECRET` must be at least 32 characters and must not contain placeholder-like substrings blocked by `docker/entrypoint.sh`.
