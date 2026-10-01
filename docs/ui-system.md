# Current UI system

Re-verified at commit `3ba4298` on 2026-09-30. The dossier detail page's action buttons and `WorkflowStepper` were both adjusted in that release to better match the rules already stated below (solid blue primary action, ghost/neutral navigation, restrained outline destructive action, distinct completed/current/upcoming stepper colors) — the rules themselves did not change, and no other page was touched.

This document derives the preferred UI language from the strongest current patterns in `PageShell`, Header, Sidebar, dashboard, professor, leave, dossier, referential, and template pages.

Core priorities:

> **Consistency over novelty. Ergonomics over decoration. Clarity over animation. Reuse over reinvention.**

## Direction and language

- Operational interfaces are Arabic-first and use `dir="rtl"` at the page, panel, or dialog level.
- Do not assume that `lang="ar"` makes the root RTL; direction is currently explicit in the UI tree.
- Use `dir="ltr"` for references, IDs, PPR/CIN values, filenames, numeric counters, and Latin-formatted dates where it improves scanning.
- Icons and action order should follow RTL reading flow.
- French remains common in API errors and internal naming; new user-visible text should follow the Arabic language of its surrounding page.

## Typography

- Cairo is the default body and sans font through `--font-cairo`.
- Inter is reserved globally for explicit `[dir="ltr"]` content.
- Body and table text are normally `text-sm`.
- Metadata, helper copy, and badges are normally `text-xs`.
- Page titles commonly use `text-xl` or `text-2xl` with bold or semibold weight.
- Avoid oversized marketing typography in administrative flows.

## Application frame and surfaces

- The Header is fixed, blue (`#1174BC`), and 56 pixels high.
- The right Sidebar begins below the Header and is white with a subtle slate border.
- The principal content background is `#F8FAFC`.
- Content is full-width with `max-w-none` and responsive horizontal padding.
- Cards, dialogs, and tables use white surfaces, slate-200 borders, and restrained shadows.
- Do not introduce centered website containers for operational tables. Constrain only dialogs, compact forms, and intentional empty states.

## Page headers

Preferred current headers provide:

- an Arabic title and concise supporting text;
- a small icon or contextual visual marker when useful;
- primary actions grouped on the opposite side;
- responsive wrapping rather than clipped actions;
- summary counters or filters below, not decorative hero content.

## Cards

Canonical administrative cards use combinations of:

```text
rounded-2xl border border-slate-200 bg-white shadow-sm
```

Use cards to group a coherent form, summary, workflow step, or table. Avoid nesting cards solely for decoration. `AppCard` is the preferred dossier card wrapper.

## Tables

- Tables live inside a bordered white surface with `overflow-x-auto`.
- Wide operational tables may use a deliberate `min-w-[...]` as a responsive fallback.
- Headers commonly use a pale slate background, small semibold text, and right alignment.
- Cells normally use `px-4 py-3 text-sm` or a comparably compact density.
- Use subtle row hover such as `hover:bg-slate-50` or `hover:bg-[#F8FAFC]`.
- Keep codes and references LTR and prevent important action controls from shrinking.
- Empty tables should render a centered, calm empty state—not an empty frame.

## Forms

- Labels are right-aligned, compact, and semibold.
- Standard controls are approximately `h-10` or `h-11`, with white backgrounds and slate borders.
- Required fields should be clear in labels or validation feedback.
- Prefer existing Input, Select, Calendar, Combobox, Label, Form, and UploadField components.
- Long forms should use responsive grids and grouped sections.
- Disable submission while a mutation is in flight and guard handlers from duplicate submission.
- Show server validation close to the form or action that caused it.

## Buttons

- Blue is the primary action color.
- Outline or ghost variants are used for secondary navigation and neutral actions.
- Red/rose is reserved for destructive or cancellation actions.
- Amber is used for archive/pending-archive actions.
- Buttons generally include a Lucide icon when it materially improves recognition.
- Maintain visible hover, focus-visible, and disabled states.
- Do not add animated button treatments beyond lightweight spinner/opacity feedback.

## Badges

Badges communicate state, not decoration. Current semantic families are:

| Variant | Typical meaning |
|---|---|
| neutral | Registered, default, inactive, or historical closed grouping. |
| info | Generated or informational progress. |
| warning | Waiting, received, in progress, or pending archive. |
| success | Completed, convincing, active, or archived detail state. |
| danger | Error, non-convincing, or cancelled. |

Dossier detail and dossier list intentionally use different status groupings. Reuse the existing status helpers instead of creating a third mapping.

## Dialogs

- Use the shared Dialog primitive.
- Apply `dir="rtl"` and explicit right-aligned headers.
- Typical widths are `max-w-md`, `max-w-lg`, or `max-w-2xl` according to content.
- Longer forms use a bounded viewport height with an internal scroll area and fixed header/footer sections.
- Confirmation dialogs must name the affected record and clearly distinguish cancel from confirm.
- Keep destructive confirmation visually restrained but unmistakable.

## Filters and search

- Filters belong close to the table or dataset they affect.
- Use responsive rows that wrap on smaller screens.
- Keep search controls compact and provide clear reset behavior.
- The global Header search is for cross-module professor/dossier navigation; module filters remain local.
- Preserve LTR entry for PPR, references, and other technical query values where appropriate.

## Sidebar and Header

Use the shared `PageShell`; do not recreate navigation per page.

- Header: fixed blue bar, global search on desktop, mobile menu, compact actions, profile initials.
- Sidebar: fixed right navigation, active-state highlighting, expandable referentials, desktop collapse, mobile overlay.
- New navigation items should use Lucide icons, Arabic labels, existing hover colors, and the same active-route logic.

## Workflow and timeline UI

The explanatory-dossier detail page is the canonical workflow example.

- `WorkflowStepper` displays five UI phases, not every database status.
- Completed steps are green, current is blue, future is muted.
- Completed/current steps may be reviewed without changing dossier state.
- `StepActionPanel` distinguishes the viewed step from the current step and offers a return-to-current action.
- Status transitions belong in APIs and domain logic; the stepper is a representation, not a state machine.

## Loading, success, and error feedback

Preferred patterns:

- centered lightweight spinner for initial loading;
- local spinner and disabled control for an in-flight action;
- inline red error panels for recoverable form/action errors;
- modal or local success confirmation after important workflow mutations;
- preserve the current page and user context when retry is possible;
- avoid indefinite blank states.

The codebase uses several variations. New work should prefer the pattern already used by the strongest neighboring page rather than inventing toast, animation, or notification infrastructure for one screen.

## Empty states

- Use a small icon, one clear Arabic explanation, and a relevant action when the user can resolve the empty state.
- Keep empty content centered within the table/card surface and visually quiet.
- Do not use large illustrations or marketing copy.

## Spacing and density

- Page stacks commonly use `space-y-4`, `space-y-5`, or `space-y-6`.
- Content padding is normally `px-4` on small screens, `sm:px-6`, and `lg:px-8`.
- Cards and dialogs generally use 16–24 pixel internal spacing.
- Preserve compact administrative density; do not enlarge every control to mobile-marketing proportions.

## Responsive behavior

- The Sidebar becomes an overlay drawer below the desktop breakpoint.
- The Header exposes a mobile menu button and hides desktop search on small screens.
- Header/action groups wrap or stack.
- Forms change from multi-column grids to one column.
- Wide tables scroll horizontally as a fallback.
- Dialogs remain viewport-bounded.

## Interaction and motion

- Motion is lightweight and functional: Sidebar width/translation, hover color, opacity, spinners, and dialog transitions.
- Prefer short Tailwind transitions already present in shared components.
- Do not introduce heavy animation libraries for ordinary RH workflows.
- Avoid motion that shifts tables or delays access to data.

## Current inconsistencies

- Some pages apply `PageShell` through a layout; others render it directly.
- The legacy French `Nav` does not match the current fixed Header/Sidebar system.
- Status labels and terminal-state lists are duplicated in multiple files.
- Error strings mix Arabic and French.
- Some pages have richer success dialogs while others use inline feedback.

These inconsistencies are not permission to create another visual language. Follow `PageShell`, current full-width pages, the shared primitives, and the nearest strong domain page.
