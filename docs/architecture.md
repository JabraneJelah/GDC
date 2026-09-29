# Technical architecture

Verified against the repository on 2026-09-15 at commit `f0d5573`, including the working-tree files present at verification time.

## Runtime shape

The project is a single Next.js App Router application. React pages and server route handlers are deployed together. Prisma connects route handlers to PostgreSQL through `@prisma/adapter-pg`; document content is stored separately on the local filesystem.

`next.config.js` sets `output: 'standalone'`. The Docker runner starts `.next/standalone/server.js` after database checks and migrations.

## App Router organization

Top-level user-facing modules under `app/` are:

- `dashboard`
- `professeurs` and `professeurs/[id]`
- `conges`
- `dossiers-explicatifs`, `nouveau`, `a-archiver`, and `[id]`
- `document-templates`
- `utilisateurs`
- `profile`
- referential pages: `categories-personnel`, `specialites`, `titres`, `services`, `hopitaux`, `grades`, `types-conge`, `jours-feries`, and `types-fautes`
- `parametrage`
- `login`

The root `app/layout.jsx` loads fonts and global CSS. It does not provide the administrative shell. Authentication routing is handled by `middleware.js`, while operational layouts are attached below the root.

## Route layouts and PageShell

Most administrative modules have a small `layout.jsx` that wraps children in the shared `PageShell`:

- dashboard
- professeurs
- conges
- utilisateurs
- profile
- parametrage
- categories, specialties, titles, services, hospitals, grades, leave types, and holidays

The dossier pages, fault-type page, and document-template page import and render `PageShell` directly. The login page does not use it.

`components/layout/PageShell.jsx` is the canonical administrative frame. It:

- mounts `UserProvider`;
- renders a fixed full-width Header at the top;
- reserves responsive space for a fixed right Sidebar;
- owns desktop collapse and mobile-open state;
- closes the mobile Sidebar after navigation;
- provides the full-width `#F8FAFC` content surface;
- renders the Footer.

There are no current page-local `PageShell` function definitions. The remaining inconsistency is where the shared shell is applied—route layout versus page—not duplicate implementations.

## Header

`components/layout/Header.jsx` is a fixed 56-pixel blue header with RTL content.

Current behavior:

- mobile menu trigger;
- debounced search after two characters;
- `GET /api/search?q=...` lookup;
- result groups for professors and explanatory dossiers;
- navigation to professor/dossier details;
- current-user initials loaded from `/api/auth/me`;
- link to `/profile`;
- visual notification and settings buttons without implemented actions.

The Header performs its own `/api/auth/me` request instead of consuming `UserProvider`.

## Sidebar

`components/layout/sidebar.jsx` is fixed on the right below the Header.

- Width is `w-64` when expanded and `w-16` when collapsed.
- Desktop collapse is controlled by `PageShell`.
- Mobile mode slides in over an overlay.
- Active routes are highlighted.
- Referentials appear in an expandable group.
- Collapsed navigation uses tooltips.
- Logout posts to `/api/auth/logout` and routes to `/login`.
- `LECTEUR_RH` users do not see entries marked `adminOnly`, currently user management and application settings.

The `adminOnly` name does not represent a real administrator role. It currently means hidden from the read-only role.

`components/layout/nav.jsx` is a separate older French horizontal navigation implementation. It is not the canonical administrative navigation and should not be copied for new pages.

## Current-user client state

`components/UserContext.jsx` defines `UserProvider`, `useCurrentUser()`, and a frontend `isLecteurRH(user)` helper.

The provider fetches `/api/auth/me` once when mounted and exposes `{ user, loading }`. Pages use this state to hide or disable mutation controls. Backend authorization remains mandatory; client hiding is not a security boundary.

See [Authentication and authorization](auth-authorization.md) for current enforcement gaps.

## Shared components

Generic shadcn-style primitives under `components/ui/`:

- Badge
- Button
- Calendar
- Card
- Combobox
- Command
- Dialog
- Form
- Input
- Label
- Pagination
- Popover
- Select
- Table

Dossier-specific components under `components/dossiers-explicatifs/`:

- `AppCard`
- `DocumentsTable`
- `FilterBar`
- `InfoGrid`
- `StatusBadge`
- `StepActionPanel`
- `UploadField`
- `WorkflowStepper`

Generic primitives should remain unaware of dossier business rules. Repeated domain behavior belongs in domain components or helpers.

## Library organization

| Path | Responsibility |
|---|---|
| `lib/prisma.js` | PrismaPg adapter, PrismaClient initialization, development reuse, and current debug-file writes. |
| `lib/auth.js` | Password hash/verification, JWT sign/verify, and cookie helpers. |
| `lib/roles.js` | Role constants and server-side read-only rejection. |
| `lib/working-days.js` | Working-day and holiday-range calculations. |
| `lib/solde-expiration.js` | Balance expiration dates by leave-type name. |
| `lib/app-settings.js` | Synchronous JSON settings read/write. |
| `lib/dossierStatusGroups.js` | Dossier list-status grouping. |
| `lib/dossiers-explicatifs/extraFields.js` | Fault-code-specific supplemental metadata. |
| `lib/dossiers-explicatifs/documentPath.js` | Dossier document path allowlist, path resolution, names, and content types. |
| `frontend/src/lib/dossierStatus.ts` | Arabic dossier labels, action labels, and badge variants. |

## Upload and storage architecture

Runtime files are stored below `public/uploads/`:

| Directory | Content |
|---|---|
| `conges` | Leave supporting documents. |
| `decisions` | Official leave decision files. |
| `correspondances` | Optional service correspondence attached at dossier creation. |
| `generated` | Generated dossier DOCX files, including generated procedures. |
| `proofs` | Dossier notification proofs. |
| `responses` | Dossier response documents. |
| `templates` | Uploaded DOCX template sources. |

`update-procedure-document` creates `public/uploads/procedures` at runtime. This is the normal-workflow storage location for manually uploaded disciplinary procedure documents (`AVERTISSEMENT`/`RETENUE`); the dossier download resolver accepts this prefix.

Docker mounts one named volume at `/app/public/uploads`, so all children of that directory are persistent in the supplied Compose deployment. Local development uses the repository filesystem. Database records store paths or JSON metadata, not file bytes.

Filesystem operations and Prisma operations do not share a transaction. See [Technical debt](technical-debt.md).

## Application settings

`lib/app-settings.js` reads and writes `data/app-settings.json`. Current keys are:

- `block_holiday_selection`
- `block_weekend_selection`

Defaults are false when the file is missing or invalid. `GET/PUT /api/app-settings` exposes the settings, and `/parametrage` is the current UI.

This is not a database-backed configuration system. The supplied Docker Compose file does not mount `/app/data`, so runtime changes are not guaranteed to survive container replacement. Both switches also currently call one combined working-day check; they are not independently enforced.

## Arabic and RTL implementation

- `app/layout.jsx` declares `lang="ar"` but does not set root `dir="rtl"`.
- Operational pages and components set `dir="rtl"` locally.
- Cairo is loaded for Arabic and Latin subsets and is the default body/Tailwind sans font.
- Inter is loaded for technical LTR content.
- Global CSS assigns Inter to elements explicitly marked `dir="ltr"`.
- References, PPR values, dates, codes, and filenames are commonly isolated as LTR.

## Global search

The Header calls `GET /api/search` with a trimmed query of at least two characters. The server searches:

- professors by Latin names, Arabic names, PPR, and CIN;
- dossiers by reference, snapshot full name, and matricule.

Results are limited and returned in separate `professeurs` and `dossiers` arrays. Search indexes were added for dossier reference/name and professor Latin/Arabic names and CIN in the June 2026 migration.

## Component reuse strategy

Established current direction:

- build pages inside `PageShell`;
- use `components/ui` for generic controls;
- use domain components for repeated dossier presentation;
- pass `className` for local spacing rather than forking primitives;
- keep status and business decisions in pages, helpers, and route handlers;
- preserve the existing compact RTL administrative language.

Current debt:

- shell attachment is inconsistent between layouts and pages;
- Header duplicates the current-user request already performed by `UserProvider`;
- old `Nav` remains in the repository;
- several business rules and status arrays are duplicated across UI and APIs;
- file-backed settings and filesystem documents introduce deployment constraints.
