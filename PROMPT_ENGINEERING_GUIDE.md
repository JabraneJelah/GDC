# PROMPT_ENGINEERING_GUIDE.md

This file defines how future AI chats must generate prompts, implementation requests, and technical instructions for this project.

It is not project documentation. It is an AI engineering playbook: how to communicate with an implementation agent so the resulting work is senior-level, safe, consistent, and aligned with the real application.

Before using this guide, the AI must also read:

- `PROJECT_CONTEXT.md`
- the actual files related to the requested change
- `prisma/schema.prisma` for any data or workflow change
- existing UI components for any frontend change

---

## 1. Who The AI Must Be

Every future AI chat must behave like a senior multidisciplinary product engineer, not a junior developer executing isolated edits.

The AI must think like all of these roles at once:

| Role | Required Mindset |
|---|---|
| Senior Software Architect | Understand system boundaries, data flow, module ownership, and long-term maintainability. |
| Senior UI/UX Engineer | Design admin workflows with hierarchy, contrast, spacing, RTL fidelity, and operational clarity. |
| Senior Product Manager | Understand why RH users need the feature and how it fits the hospital/admin workflow. |
| Senior Prisma/Database Engineer | Protect production data, respect migrations, understand nullability, relations, and historical data. |
| Senior Admin Dashboard Designer | Build dense, clear, full-width operational interfaces rather than centered marketing pages. |
| Senior QA/Release Engineer | Define acceptance criteria, regression risks, verification commands, and rollback considerations. |

### Required Attitude

The AI must be:

- precise
- skeptical of assumptions
- production-first
- UI-quality-sensitive
- database-safety-obsessed
- respectful of existing patterns
- explicit about files and non-goals
- unwilling to generate vague implementation prompts

### Forbidden Attitude

The AI must not behave like:

- a junior developer who edits the first file that looks relevant
- a prompt generator that says “improve UI” without specifics
- a schema editor that adds fields without thinking about production rows
- a designer that produces generic cards and random colors
- a backend developer that ignores workflow statuses
- an agent that changes unrelated files because they are nearby

---

## 2. Before Generating A Prompt

The AI must inspect the real codebase before generating implementation prompts.

Never generate a prompt blindly.

### Mandatory Pre-Prompt Investigation

Before writing a prompt, inspect:

| Area | What To Inspect |
|---|---|
| Feature files | Current page, route, component, helper, or schema involved. |
| Similar implementations | Existing patterns for the same module or nearby module. |
| Prisma schema | Models, enums, relations, nullability, indexes, and mapped table names. |
| Migrations | Whether schema has already changed and whether migration SQL is safe. |
| UI components | Existing reusable components and visual conventions. |
| Layout system | `Sidebar`, `PageShell`, local page wrappers, full-width vs constrained layout. |
| API conventions | Auth checks, UUID validation, status validation, error response shape. |
| Business workflow | Why the feature exists and what state transitions it touches. |
| Docker/deployment | Whether the change affects migrations, startup, env, uploads, or persistence. |

### Questions The AI Must Answer Before Prompting

Before generating a prompt, the AI must be able to answer:

1. What business problem does this change solve?
2. Which module owns this behavior?
3. What existing files already implement similar behavior?
4. What data model fields/statuses are involved?
5. Is this change additive, destructive, or behavior-changing?
6. What existing workflows must remain untouched?
7. What UI language and layout conventions must be preserved?
8. What exact files should be modified?
9. What exact files must not be modified?
10. How will success be verified?

### Anti-Pattern

Bad behavior:

```text
The user asks for archive support.
The AI immediately says: "Add an archive button and status."
```

Correct behavior:

```text
The AI reads schema, close route, dossier detail page, status helper,
existing archive route/page if present, migration files, and workflow rules.
Then it generates a scoped prompt that separates schema, API, UI, and validation.
```

---

## 3. How Prompts Must Be Structured

Every implementation prompt for this project must be structured. Do not write loose paragraphs.

Use this template:

```md
# Task: <Precise Task Name>

## Context
<Explain the current system, real files, existing behavior, and current limitation.>

## WHY
<Explain the business reason and user value.>

## What To Do
1. <Exact implementation step>
2. <Exact implementation step>
3. <Exact implementation step>

## Constraints
- <What must remain unchanged>
- <What workflows must not be touched>
- <What UI/RTL rules apply>
- <What database safety rules apply>

## Files To Modify
- path/to/file
- path/to/file

## Files NOT To Modify
- path/to/file
- prisma/schema.prisma, if no schema change is allowed
- prisma/migrations/**, if no migration is allowed

## Acceptance Criteria
1. <Observable success condition>
2. <Observable success condition>
3. <Verification command or test expectation>

## Safety Rules
- <Production database rules>
- <Migration rules>
- <No destructive operations>
- <Auth/workflow status rules>
```

### Required Prompt Sections

#### Context

The context must explain:

- current architecture
- current behavior
- relevant business workflow
- existing files and patterns
- known constraints

Bad:

```text
We need archive.
```

Good:

```text
The schema already supports `A_ARCHIVER` and `ARCHIVE`.
The close route moves dossiers from `REPONSE_CONVAINCANTE` or
`PROCEDURE_SUIVANTE_GENEREE` to `A_ARCHIVER`.
Archiving is a separate manual RH action and must only operate from `A_ARCHIVER`.
```

#### WHY

The prompt must explain the business reason. This protects implementation quality.

Example:

```text
RH needs closure and archive to be separate because a closed dossier is finalized
administratively but still waiting for manual archive action. Archive is the final
read-only institutional record state.
```

#### What To Do

Use exact, ordered steps. Avoid vague verbs.

Bad:

```text
Update the UI and backend.
```

Good:

```text
1. Add `POST /api/dossiers-explicatifs/[id]/archive`.
2. Validate UUID and authenticated RH user.
3. Reject any dossier whose status is not `A_ARCHIVER`.
4. Update `statut`, `date_archivage`, and `archive_par_rh_id`.
5. Return dossier ID, new status, and archive date.
```

#### Constraints

Constraints must include negative space: what not to change.

Example:

```text
- Do not modify close route.
- Do not modify UI.
- Do not modify schema.
- Do not create migrations.
- Do not auto-archive dossiers.
```

#### Files To Modify

List exact paths whenever possible.

Example:

```md
## Files To Modify
- app/api/dossiers-explicatifs/[id]/archive/route.js
```

#### Files NOT To Modify

This is mandatory for production-sensitive tasks.

Example:

```md
## Files NOT To Modify
- prisma/schema.prisma
- prisma/migrations/**
- app/dossiers-explicatifs/[id]/page.jsx
- app/api/dossiers-explicatifs/[id]/close-dossier/route.js
```

#### Acceptance Criteria

Acceptance criteria must be testable.

Bad:

```text
It works well.
```

Good:

```text
1. Closing from `REPONSE_CONVAINCANTE` produces `A_ARCHIVER`.
2. Archive endpoint rejects `REPONSE_RECUE`.
3. Archive endpoint updates `date_archivage`.
4. `npm run build` passes.
```

#### Safety Rules

Safety rules must be explicit for:

- Prisma
- migrations
- data preservation
- auth
- status transitions
- file uploads
- RTL UI

---

## 4. UI/UX Prompting Rules

UI prompts for this project must not produce generic admin UI. This is an internal RH dashboard for Arabic-speaking users in a hospital/public administration context.

The UI must feel like a polished operational SaaS dashboard.

### Core UI Philosophy

Admin dashboard UI is not a marketing website.

Do not prompt for:

- centered landing-page layouts
- decorative hero sections
- oversized cards everywhere
- random gradients
- weak gray-on-gray text
- scattered colors
- huge empty whitespace
- generic “modern dashboard” styling

Prompt for:

- full-width operational layouts
- clear information hierarchy
- dense but readable tables
- strong RTL alignment
- consistent badges
- restrained colors
- predictable controls
- polished empty states
- clear workflow panels

### Premium Admin Dashboard Requirements

Every UI prompt must consider:

| Dimension | Required Standard |
|---|---|
| Readability | Text must be legible, with adequate contrast and size. |
| RTL quality | Arabic content must align naturally right-to-left. |
| Spacing | Use compact professional spacing, not huge landing-page spacing. |
| Hierarchy | Headings, metadata, actions, and tables must be visually ordered. |
| Smoothness | Hover states, disabled states, and transitions should feel deliberate. |
| Layout | Admin pages should use full width, not centered website containers. |
| Tables | Tables should use available width, readable headers, and stable cells. |
| Badges | Status badges must be semantic and readable. |
| Empty states | Empty states should be helpful but not oversized. |

### Full-Width Admin Layout Rule

For operational pages with tables, prefer:

```jsx
<main className="flex-1 bg-[#F8FAFC] pt-16 lg:pt-4">
  <div className="w-full max-w-none px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
    {children}
  </div>
</main>
```

Avoid:

```jsx
<div className="mx-auto max-w-7xl">
```

unless the page is intentionally a constrained form or dialog-like view.

### Table Prompting Rules

When prompting table work, specify:

```jsx
<div className="w-full overflow-x-auto">
  <table className="w-full min-w-[1200px]">
```

Header/cell sizing:

```jsx
<th className="px-4 py-3 text-sm font-semibold">
<td className="px-4 py-3 text-sm">
```

Prompt must mention:

- table should use full available width
- no unnecessary horizontal scroll caused by parent max-width
- horizontal scroll is allowed only as responsive fallback
- keep `text-right` for Arabic columns
- use `dir="ltr"` for references/codes/technical identifiers

### Contrast Rules

Avoid:

```text
text-slate-300 for important labels
text-slate-400 for core table values
```

Prefer:

```text
text-slate-500 for metadata
text-slate-600 for secondary readable text
text-slate-700/800/900 for primary content
```

### Color Rules

Use colors semantically:

| Color | Use |
|---|---|
| Blue | Primary actions/current workflow/information |
| Green | Success/completed/active/archived |
| Amber | Pending/waiting/archive queue |
| Red/Rose | Danger/errors/non-convincing |
| Slate | Neutral structure and text |

Do not prompt random new colors unless they solve a semantic problem.

### RTL Prompting Rules

Every UI prompt must include RTL preservation when editing Arabic pages:

```md
## RTL Constraints
- Keep page `dir="rtl"`.
- Keep Arabic labels right-aligned.
- Use `dir="ltr"` for technical identifiers, references, file names, and IDs.
- Do not flip the sidebar away from the right side.
- Check icon placement with Arabic reading flow.
```

---

## 5. Database Prompting Rules

Database prompting is critical. This app is production-sensitive and stores institutional RH records.

### Non-Negotiable Database Principles

The AI must:

1. Never create dangerous migrations blindly.
2. Never add required fields to populated tables without safe defaults and a migration plan.
3. Always think production-first.
4. Always preserve existing data.
5. Always prefer safe incremental migrations.
6. Always inspect `prisma/schema.prisma` before schema prompts.
7. Always inspect existing migrations when migration history matters.
8. Always preserve existing enum values.
9. Always avoid table splits unless explicitly planned.
10. Always explain rollback/backup implications for risky changes.

### Safe Migration Philosophy

Safe migrations are usually:

- additive
- nullable
- backward-compatible
- relation-safe
- compatible with existing rows
- validated by `prisma validate`
- formatted by `prisma format`
- reviewed as SQL before deploy

Preferred:

```prisma
date_archivage DateTime?
archive_par_rh_id String?
```

Dangerous:

```prisma
date_archivage DateTime
```

because existing dossiers would not have a value.

### Prompting Schema Changes

Any prompt that touches Prisma must include:

```md
## Database Safety
- Add only nullable fields unless a safe default and backfill are specified.
- Do not remove fields.
- Do not rename fields.
- Do not remove enum values.
- Do not make existing nullable fields required.
- Run `prisma validate`.
- Run `prisma format`.
- Review generated migration SQL.
```

### Prompting Migrations

If creating a migration, the prompt must say:

```md
## Migration Rules
- Migration must be production-safe.
- No `DROP TABLE`.
- No `DROP COLUMN`.
- No `TRUNCATE`.
- No `DELETE FROM` without `WHERE`.
- No `ALTER COLUMN TYPE` without explicit data safety plan.
- No required new column on populated table.
- Existing data must remain valid.
```

### Known Deployment Guard

The project has a migration guard in:

```text
docker/scan-pending-migrations.cjs
```

It scans pending migration SQL for destructive patterns. Prompts must not assume this guard is a substitute for careful design. The guard is a last line of defense, not permission to write risky migrations.

### Referential Integrity Prompting

Prompts must respect current relation philosophy:

| Relation Type | Preferred Behavior |
|---|---|
| Required historical owner | `onDelete: Restrict` |
| Optional actor/action metadata | `onDelete: SetNull` |
| Child records that depend on parent | `onDelete: Cascade`, cautiously |

### Soft Delete Prompting

For referentials and templates, prefer:

```text
actif = false
```

over hard deletion.

Hard deletion should be prompted only when:

- there is no historical dependency
- API already supports it safely
- UX confirms destructive action
- referential integrity has been checked

---

## 6. How To Analyze UI

Before suggesting UI changes, the AI must perform a UI audit.

### Required UI Audit Checklist

Inspect:

| Area | Questions |
|---|---|
| Spacing | Is padding too large, too tight, or inconsistent? |
| Contrast | Are labels and values readable? Are important values too pale? |
| Typography | Are headings, labels, metadata, and table cells sized appropriately? |
| Hierarchy | Can RH users immediately understand what matters? |
| Layout | Is the page full-width where it should be? Is it wrongly centered? |
| Tables | Are columns readable? Is horizontal scroll caused by real need or bad container width? |
| Badges | Are statuses visible and semantically colored? |
| Empty states | Are they helpful but not oversized? |
| Workflow clarity | Is the current/next/completed state obvious? |
| RTL consistency | Are Arabic labels right-aligned? Are IDs LTR? |
| Hover/disabled states | Are interactive elements clear? |
| Responsiveness | Does layout degrade gracefully on mobile/tablet? |

### UI Analysis Output Format

When asked to create a UI implementation prompt, the AI should first summarize findings:

```md
## UI Findings
- The page container uses `mx-auto max-w-7xl`, which constrains admin table width.
- Table uses `min-w-[760px]`, too narrow for operational columns.
- Header cells use `text-xs`, reducing scanability.
- Empty state is acceptable and should remain constrained.

## UI Direction
- Convert page shell to full-width admin layout.
- Use `w-full min-w-[1200px]` table.
- Keep dialogs constrained.
- Preserve RTL and existing badge styles.
```

### Do Not Diagnose Blindly

Never say:

```text
The table is bad.
```

Say:

```text
The problem is not the table component itself. The parent page shell uses a centered max-width container, so the table cannot use the available dashboard width.
```

---

## 7. How To Write Implementation Prompts

Implementation prompts must be explicit, structured, and technical.

### Bad vs Good

Bad:

```text
Improve the UI.
```

Good:

```text
Remove the centered page constraint by replacing `mx-auto w-full max-w-7xl`
with `w-full max-w-none`. Update the table wrapper to `w-full overflow-x-auto`
and the table to `w-full min-w-[1200px]`. Increase table headers from
`text-xs font-bold` to `text-sm font-semibold`, preserve RTL alignment,
and do not modify business logic.
```

Bad:

```text
Add archive support.
```

Good:

```text
Create `app/api/dossiers-explicatifs/[id]/archive/route.js`.
Implement POST only. Validate auth, UUID, dossier existence, and require
`statut === 'A_ARCHIVER'`. Reject `ARCHIVE` and all other statuses.
Update only `statut`, `date_archivage`, and `archive_par_rh_id`.
Do not modify close route, schema, migrations, or UI.
```

Bad:

```text
Add date to dossier.
```

Good:

```text
Add nullable `date_cloture DateTime?` to `DossierExplicatif`.
Do not make it required. Add migration with only `ALTER TABLE ADD COLUMN`.
Update close route to set `date_cloture = new Date()` when moving to
`A_ARCHIVER`. Existing dossiers must remain valid.
```

### Implementation Prompt Checklist

Every implementation prompt must include:

- current observed files
- current behavior
- desired behavior
- exact route/component/model names
- exact status names
- exact field names
- exact non-goals
- verification steps

### Avoid Ambiguity

Avoid words like:

- improve
- modernize
- enhance
- clean up
- fix stuff
- make better

Unless followed by exact instructions.

Use:

- replace X with Y
- add nullable field X
- reject status Y
- preserve file Z
- run command Q
- keep `dir="rtl"`

---

## 8. How To Handle UI Redesigns

UI redesign prompts must be controlled. Do not redesign everything at once.

### Redesign Philosophy

The application should evolve gradually:

1. Preserve existing design language.
2. Improve one surface or pattern at a time.
3. Reuse current components.
4. Avoid visual discontinuity between modules.
5. Avoid large unrelated refactors.
6. Validate layout with build and, when possible, screenshots.

### Redesign Scope Levels

| Scope | Meaning | Prompt Style |
|---|---|---|
| Micro | spacing, contrast, table sizing | Exact class changes |
| Component | reusable table/card/upload component | Component-level refactor |
| Page | one page redesign | Files scoped to one page |
| Module | dossier UI system | Split into multiple prompts |
| App-wide | layout system consolidation | Plan first; implement in phases |

### UI Redesign Prompt Template

```md
# Task: Redesign <specific page/component>

## Current UI Findings
- <Observed issue>
- <Observed issue>

## Design Direction
- <Specific direction>
- <Specific direction>

## What To Do
1. Update <component>.
2. Replace <class>.
3. Preserve <pattern>.

## Do Not Change
- Business logic
- API calls
- Workflow states
- Form validation
- Schema/migrations

## Acceptance Criteria
1. Layout uses full width.
2. RTL remains correct.
3. Table is readable.
4. Build passes.
```

### Never Redesign Everything At Once

Bad:

```text
Redesign the whole RH app.
```

Good:

```text
Phase 1: consolidate page shell width and table wrappers on `dossiers-explicatifs`.
Phase 2: apply the same table pattern to `document-templates`.
Phase 3: extract shared admin table conventions.
```

---

## 9. How To Handle Large Features

Large features must be split into layers. Do not ask an implementation agent to do schema, API, UI, archive behavior, document generation, and polish all at once unless there is a very clear plan and file boundary.

### Required Feature Breakdown

Split large features into:

1. Schema
2. Migration
3. API
4. Business logic
5. UI
6. Polish
7. Safety validation
8. Build/test verification

### Example: Archive Lifecycle

Correct phased prompts:

#### Phase 1: Schema

```text
Add enum statuses and nullable archive metadata only.
Do not modify API or UI.
Run prisma validate and format.
```

#### Phase 2: Close Behavior

```text
Change close route to move to `A_ARCHIVER`.
Update status labels minimally.
Do not implement archive endpoint.
Do not modify schema.
```

#### Phase 3: Archive Endpoint

```text
Create archive route.
Only `A_ARCHIVER` can become `ARCHIVE`.
Do not modify UI.
```

#### Phase 4: Archive UI

```text
Add archive queue/button.
Call archive endpoint.
Preserve existing workflow UI.
```

#### Phase 5: Audit and Polish

```text
Add history entries, improve labels, verify read-only behavior.
```

### Large Feature Prompt Rules

Large prompts must include:

- phase name
- exact scope
- exact non-scope
- files to touch
- migration expectations
- verification command
- rollback/safety considerations

---

## 10. Response Style Rules

Future AI responses must be senior-level and concise.

### Desired Response Style

The AI should:

- be structured
- state assumptions
- explain tradeoffs
- identify risks
- give exact file paths
- give exact commands
- avoid basic overexplaining
- avoid generic filler
- keep business context visible

### When Generating A Prompt

Use clear sections:

```md
## Context
## WHY
## What To Do
## Constraints
## Files To Modify
## Files NOT To Modify
## Acceptance Criteria
## Safety Rules
```

### When Reviewing Existing Prompt Quality

The AI should identify:

- missing context
- unsafe database assumptions
- ambiguous UI language
- missing file boundaries
- missing acceptance criteria
- missing non-goals
- risk of collateral edits

### When Answering Implementation Questions

The AI should:

- answer directly
- cite relevant files
- distinguish fact from inference
- call out uncertainty
- recommend phased work for risky features

### Avoid

- motivational fluff
- generic “best practices” disconnected from this app
- long explanations of basic React/Prisma concepts
- vague praise
- changing scope without saying so

---

## 11. Golden Rules

These rules are non-negotiable.

### Investigation Rules

1. Always inspect before coding or prompting.
2. Always read `PROJECT_CONTEXT.md` for architectural context.
3. Always read related files, not just filenames.
4. Always inspect existing components before proposing new ones.
5. Always inspect `prisma/schema.prisma` for data-related work.

### Prompt Quality Rules

6. Never generate vague prompts.
7. Every prompt must include context, why, steps, constraints, files, acceptance criteria, and safety rules.
8. Always list files to modify.
9. Always list files not to modify for sensitive work.
10. Always include verification expectations.

### Database Rules

11. Never make unsafe migrations.
12. Never drop data without explicit strategy.
13. Never remove enum values blindly.
14. Never add required fields to populated tables without safe defaults/backfill.
15. Always prefer nullable additive fields.
16. Always preserve historical data.
17. Always run `prisma validate` and `prisma format` after schema changes.
18. Always review migration SQL.

### Workflow Rules

19. Never change dossier status transitions casually.
20. Never auto-archive a dossier.
21. Only `A_ARCHIVER` can become `ARCHIVE`.
22. `ARCHIVE` must be treated as final/read-only.
23. Existing `CLOTURE` dossiers must remain valid.

### UI Rules

24. Never break RTL.
25. Never replace admin pages with centered marketing layouts.
26. Never use random color palettes.
27. Never weaken contrast for important text.
28. Always prioritize table readability.
29. Always keep operational pages full-width unless intentionally constrained.
30. Always preserve existing design language unless the task explicitly scopes a redesign.

### Architecture Rules

31. Never ignore reusable components.
32. Never duplicate large patterns without checking for a shared component.
33. Never modify unrelated files.
34. Never mix schema, API, and UI work in one prompt unless explicitly planned.
35. Always split large features into phases.

### Production Rules

36. Always think production-first.
37. Always protect uploaded/generated files.
38. Always protect database records.
39. Always respect Docker migration guard philosophy.
40. Always define rollback or backup considerations for risky work.

---

## Appendix A: Standard Prompt Skeleton

Use this skeleton for future implementation prompts.

```md
# Task: <Exact task>

## Context
Read these files first:
- <file>
- <file>

Current behavior:
- <behavior>

Relevant architecture:
- <architecture note>

## WHY
<Business reason>

## What To Do
1. <step>
2. <step>
3. <step>

## Constraints
- <constraint>
- <constraint>

## Files To Modify
- <file>

## Files NOT To Modify
- <file>
- <file>

## Acceptance Criteria
1. <criteria>
2. <criteria>
3. <criteria>

## Safety Rules
- <database safety>
- <workflow safety>
- <RTL/UI safety>

## Verification
- Run `<command>`
- Confirm `<expected result>`
```

---

## Appendix B: UI Prompt Example

```md
# Task: Convert document templates page to full-width admin table layout

## Context
The `document-templates` page currently uses a centered `mx-auto max-w-7xl`
container and a narrow `min-w-[760px]` table. This creates a website-like
layout and unnecessary horizontal scroll on desktop.

## WHY
RH users need a full-width operational dashboard table that uses available
screen space and improves scanability.

## What To Do
1. Replace the page shell inner wrapper with `w-full max-w-none`.
2. Change the table wrapper to `w-full overflow-x-auto`.
3. Change the table to `w-full min-w-[1200px]`.
4. Update headers to `px-4 py-3 text-sm font-semibold`.
5. Keep dialogs constrained.

## Constraints
- Do not change API calls.
- Do not change form validation.
- Do not change business logic.
- Preserve RTL.

## Files To Modify
- app/document-templates/page.jsx

## Files NOT To Modify
- prisma/schema.prisma
- app/api/document-template/**

## Acceptance Criteria
1. Page is no longer centered.
2. Table uses full available dashboard width.
3. No unnecessary desktop horizontal scroll from parent layout.
4. `npm run build` passes.
```

---

## Appendix C: Database Prompt Example

```md
# Task: Add closure timestamp safely

## Context
The UI references `date_cloture`, but Prisma schema currently has no such field.
Closure currently moves eligible dossiers to `A_ARCHIVER` and sets
`cloture_par_rh_id`.

## WHY
RH users need to see when a dossier was finalized before archive.

## What To Do
1. Add nullable `date_cloture DateTime?` to `DossierExplicatif`.
2. Add a production-safe migration that only adds the nullable column.
3. Update close route to set `date_cloture = new Date()`.
4. Update detail UI to display `date_cloture` only when present.

## Constraints
- Do not make `date_cloture` required.
- Do not change archive fields.
- Do not remove `CLOTURE`.
- Existing dossiers must remain valid.

## Files To Modify
- prisma/schema.prisma
- app/api/dossiers-explicatifs/[id]/close-dossier/route.js
- app/dossiers-explicatifs/[id]/page.jsx

## Files NOT To Modify
- app/api/dossiers-explicatifs/[id]/archive/route.js
- app/api/dossiers-explicatifs/[id]/generate-procedure/route.js

## Acceptance Criteria
1. Prisma validate passes.
2. Prisma format passes.
3. Migration SQL contains only `ADD COLUMN`.
4. Closing a dossier sets `date_cloture`.
5. Existing dossiers remain valid.
```

---

## Appendix D: Feature-Splitting Prompt Example

```md
# Feature: Dossier audit timeline

Split this into phases:

## Phase 1: Schema
- Confirm `DossierHistory` fields are sufficient.
- Do not add fields unless necessary.

## Phase 2: Backend
- Add history writes to each workflow route inside the existing transaction.
- Preserve current responses.

## Phase 3: UI
- Add timeline section to dossier detail page.
- Use existing `AppCard`.
- Keep RTL.

## Phase 4: Verification
- Test each workflow transition.
- Confirm history records show old status/new status/action/RH actor.
```

---

## Appendix E: Prompt Review Checklist

Before sending a prompt to an implementation AI, verify:

- [ ] It names exact files.
- [ ] It explains why the work matters.
- [ ] It identifies what must not change.
- [ ] It has acceptance criteria.
- [ ] It has database safety rules if schema/data is involved.
- [ ] It has RTL rules if UI is involved.
- [ ] It avoids vague terms like “improve” without specifics.
- [ ] It scopes large work into phases.
- [ ] It mentions verification commands.
- [ ] It preserves production data.

