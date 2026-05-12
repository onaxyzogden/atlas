# ADR: Observe-Port Stylesheet Retired — Migrated to Co-Located CSS Modules

**Date:** 2026-05-12
**Status:** accepted — shipped
**Branch:** `feat/atlas-permaculture`
**Supersedes (styling section of):** [2026-05-06-atlas-observe-port-styling.md](2026-05-06-atlas-observe-port-styling.md)

## Context

The 2026-05-06 ADR landed option 1 — a wholesale port of the OLOS stylesheet
(~22 k lines, 4,091 scoped rules) emitted into
`apps/web/src/v3/observe/styles/observe-port.css` by
`scripts/scope-observe-styles.mjs`, applied via a `.observe-port` wrapper on
the slide-up root. That unblocked Phase B with full visual fidelity but left
two known costs: two design systems in one app and a re-run-on-reference-
change generator. With Observe substantively complete and Plan / Act growing
in parallel, the cost of carrying a generated 22 k-line stylesheet alongside
co-located CSS Modules everywhere else in the app outweighed the original
shipping benefit.

## Decision

Retire the wholesale port. Migrate every consumed selector into a co-located
`Foo.module.css` next to its `Foo.tsx`, then delete the stylesheet, the
`.observe-port` wrapper, and the generator script.

Path C ran in 10 phases, each one mechanical and verifiable:

1. **Audit** — `scripts/map-observe-port-consumers.py` (tightened to
   `className=` matches only) emitted the consumer set per selector.
2. **Built-environment cluster** — no-op (already module-scoped).
3–7. **Module surfaces** — human-context, macroclimate-hazards, topography,
   earth-water-ecology, sectors-zones, swot-synthesis. One module per phase;
   each component got its own `.module.css` with descendant selectors and
   media queries lifted from the generated stylesheet.
8. **`_shared/components/` cluster** — MetricStrip, ActionCard, ChipList,
   ModuleSummaryCard, InsightSidebar, NextStepsPanel, ModuleCard,
   AnnotationListCard. ChipList tone narrowed from `tone?: string` to
   `tone?: 'green' | 'gold' | 'orange'` with `styles[tone]` lookup.
   ModuleCard dropped ~30 SVG-internal selectors (`.figure`, `.ground`, …)
   which were dead — consumers render `<img>` via CroppedArt, not inline SVG.
9. **Stragglers** — `perc-gauge`, `species-observation-list`, and a handful
   of bare className strings flagged by the audit had no matching rules
   anywhere in the source stylesheet. Confirmed dead; left as-is.
10. **Teardown.**
    - Deleted [apps/web/src/v3/observe/styles/observe-port.css](../../apps/web/src/v3/observe/styles/observe-port.css)
      (the 22 172-line generated sheet) and the now-empty `styles/` dir.
    - Deleted [scripts/scope-observe-styles.mjs](../../scripts/scope-observe-styles.mjs).
    - Removed `import '../styles/observe-port.css'` and the `observe-port`
      wrapper class from [ModuleSlideUp.tsx](../../apps/web/src/v3/observe/components/ModuleSlideUp.tsx);
      sheet root is now plain `className={css.sheet}`.
    - Updated JSDoc on the shared
      [ModuleSlideUp.sheetClassName](../../apps/web/src/v3/_shared/moduleNav/ModuleSlideUp.tsx)
      prop (no more `observe-port` mention).
    - Rewrote the Styling section of
      [apps/web/src/v3/observe/README.md](../../apps/web/src/v3/observe/README.md)
      and back-linked the original ADR.

## Verification

- `npm run typecheck` clean for every Observe path (one unrelated TS2353 in
  `v3/plan/draw/UtilityConflictDialog.tsx` predates this work).
- Dev preview restarted (clears stale HMR for the deleted stylesheet);
  Human Context slide-up renders correctly — hero, tabs, MetricStrip, all
  cards visually unchanged from pre-migration. The sheet `<aside>` no
  longer carries the `observe-port` class.
- No `observe-port` references remain in the codebase outside this ADR and
  the 2026-05-06 historical record.

## Trade-offs accepted

- **Per-file porting cost paid.** ~30 components now own their CSS. Worth
  it: each is now self-contained, hashed at build, dead-code-eliminable.
- **Two-design-system risk removed.** OLOS tokens (`--olos-*`) survive only
  where individual modules still reference them; future per-component token
  swaps to atlas's palette are now local changes, not generator re-runs.
- **Wholesale re-run on reference update is gone.** OLOS reference is
  frozen for Observe; further design iteration happens in atlas directly.

## Out of scope

- Token reconciliation between `--olos-*` and atlas's tokens (deferred —
  per-component now).
- Plan / Act styling — already module-scoped; unaffected.
