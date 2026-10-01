# Repository operating rules for AI coding agents

This file governs how AI coding agents work in this repository. It is intentionally concise. Read the relevant documents under `docs/` for domain details.

## Source of truth

1. Read the relevant repository code before changing anything.
2. Repository implementation overrides stale documentation — including `PROJECT_CONTEXT.md`, this file, and every file under `docs/`. If code and documentation disagree, trust the code and flag the documentation as stale; do not silently propagate the discrepancy into new work.
3. Read the relevant `docs/` documents before modifying a domain.
4. Treat documentation as a verified guide, not a substitute for inspecting code and migrations.
5. Never document, or act on, uncommitted local changes as if they were shipped current behavior. Check `git status`/`git log` against `HEAD` when it matters whether something is actually deployed.

## Scope and behavior

6. Keep changes narrowly scoped and do not modify unrelated files.
7. Do not mix unrelated cleanup, refactors, or fixes into feature work, even when you notice something else that looks wrong nearby. Report it instead of folding it into the current change.
8. Preserve existing business behavior unless the task explicitly changes it.
9. Reuse existing components and utilities before creating alternatives.
10. Report exactly what changed, what was validated, and any remaining risks.
11. **Risk-based workflow**: a low-risk, narrowly scoped change (e.g., a UI-only style adjustment, a bug fix confined to one route, an additive filter reusing existing data) may be implemented directly once the relevant code has been inspected. A change touching Prisma/schema, authentication/authorization, document/file storage, or dossier workflow/status transitions requires the explicit impact analysis below **before** any code is written.

## Respecting other work in the working tree

12. Before starting, run `git status` and `git diff` to see what is already present. Uncommitted or unstaged changes belong to someone else's in-progress work unless the task says otherwise.
13. Never stage, commit, discard, stash, or overwrite another change's edits to satisfy the current task. If isolating your own change requires disentangling it from unrelated uncommitted work, stage only the files your task actually touches — never `git add -A`/`git add .` as a shortcut.
14. If existing uncommitted work conflicts with the current task or the task can't be done cleanly without touching it, stop and report the conflict rather than resolving it unilaterally.

## Database and production data

15. Protect production data above implementation convenience.
16. Never use `prisma migrate reset` as a production solution.
17. Never assume generated migration SQL is safe. Inspect every `migration.sql` for schema-changing work.
18. Treat `DROP`, `DELETE`, `TRUNCATE`, `SET NOT NULL`, type conversions, foreign-key changes, unique constraints, and table recreation as high risk.
19. Design migrations for populated databases, not only fresh databases.
20. Prefer additive and backward-compatible schema evolution, with explicit backfill and rollback/restore plans where needed.
21. Do not infer deployed database state from `prisma/schema.prisma` alone; inspect `prisma/migrations/` and deployment behavior.
22. Take or confirm a production backup before any migration or operation that could plausibly be destructive; see `AUTO_BACKUP_BEFORE_MIGRATE` and the restore helper in `docs/deployment-operations.md`. Do not assume a backup exists just because the option is available.
23. **Application rollback is not database rollback.** Reverting the deployed application code (redeploying a previous image/commit) does not undo an already-applied migration or already-mutated data. Do not present a code rollback as if it also restores prior database or storage state.
24. Never modify or delete files under `public/uploads/` (or any production-equivalent upload/document store) outside of the application's own reviewed, intentional code paths. Do not delete, move, or "clean up" uploaded/generated files manually while investigating or testing — treat them with the same care as database rows, since they are real records referenced by `DossierDocument`/`Conge`/etc. rows.

## UI implementation

25. Preserve Arabic RTL behavior.
26. Follow `docs/ui-system.md`; do not introduce a page-specific design language.
27. Reuse shared layouts and UI primitives before creating alternatives.
28. Keep UI lightweight. Avoid unnecessary animation, decoration, and dependencies.
29. Handle loading, error, disabled, empty, and duplicate-submission states.

## Validation

30. Run validation appropriate to the change before declaring it complete. For meaningful application changes this normally includes the relevant focused checks and `npm run build` when feasible.
31. Do not claim a behavior is enforced unless both the relevant frontend and backend paths have been checked.

## Explicit impact analysis

Before implementing high-risk work involving Prisma, migrations, authentication, authorization, document storage, workflow/status transitions, or production deployment, document the impact on:

- existing and populated data;
- backward compatibility and in-flight records;
- API callers and UI state;
- permissions and failure modes;
- filesystem/database consistency;
- deployment, backup, and recovery.

Relevant references:

- `docs/database.md`
- `docs/auth-authorization.md`
- `docs/dossiers-explicatifs.md`
- `docs/deployment-operations.md`
- `docs/ui-system.md`
- `docs/technical-debt.md`
