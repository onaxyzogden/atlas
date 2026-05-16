# Observe `_shared/components/` primitives deleted (post-reskin cleanup)

**Date:** 2026-05-12
**Scope:** `apps/web/src/v3/observe/_shared/components/` (12 primitives + barrel + parent `_shared/` dir)
**Status:** Closed.

## Problem

Yesterday's full Observe reskin
([2026-05-11-atlas-observe-human-context-reskin](2026-05-11-atlas-observe-human-context-reskin.md))
migrated all seven Observe modules onto the shared `stageCard` primitives
at `apps/web/src/v3/_shared/stageCard/` (`stageCard.module.css` +
`observeExtras.module.css`). With dashboards rendering directly against
the shared CSS modules, the older React component primitives under
`apps/web/src/v3/observe/_shared/components/` lost their consumers.

A grep across `apps/web/src` found exactly one live importer of the
`_shared/components/index.ts` barrel: `components/AnnotationListCard.tsx`,
which used `SurfaceCard` as a `<section>` wrapper. `AnnotationListCard`
is itself imported by six of the seven Observe module dashboards
(human-context, built-environment, earth-water-ecology,
macroclimate-hazards, swot-synthesis, topography), so a direct delete
would have broken the build.

## Decision

Inline `SurfaceCard`'s output into `AnnotationListCard`, then delete the
entire `_shared/components/` directory and its (now-empty) `_shared/`
parent in one commit.

`SurfaceCard` was 11 lines of JSX wrapping a CSS module with a single
`.card` rule (border · radius · `--color-panel-card` background ·
inset green box-shadow). The four rules were folded into
`AnnotationListCard.module.css`'s existing `.panel` rule, and the JSX
swapped to a plain `<section className={styles.panel}>`. No behavioural
change — same DOM tag, same composed styles.

## Files

**Deleted (24 files)**

`apps/web/src/v3/observe/_shared/components/`
- `ActionCard.tsx` + `ActionCard.module.css`
- `ChipList.tsx` + `ChipList.module.css`
- `CroppedArt.tsx` (no CSS sibling)
- `DataTable.tsx` + `DataTable.module.css`
- `FormFields.tsx` + `FormFields.module.css`
- `InsightSidebar.tsx` + `InsightSidebar.module.css`
- `MetricStrip.tsx` + `MetricStrip.module.css`
- `ModuleCard.tsx` + `ModuleCard.module.css`
- `ModuleSummaryCard.tsx` + `ModuleSummaryCard.module.css`
- `NextStepsPanel.tsx` + `NextStepsPanel.module.css`
- `ProgressRing.tsx` + `ProgressRing.module.css`
- `SurfaceCard.tsx` + `SurfaceCard.module.css`
- `index.ts`

Parent directory `apps/web/src/v3/observe/_shared/` was empty after the
`components/` removal and was deleted with it.

**Modified**
- `apps/web/src/v3/observe/components/AnnotationListCard.tsx` — drop
  `import { SurfaceCard } from '../_shared/components/index.js'`;
  swap `<SurfaceCard className={styles.panel}>` → `<section className={styles.panel}>`.
- `apps/web/src/v3/observe/components/AnnotationListCard.module.css` —
  `.panel` rule absorbs `min-width`, `border`, `border-radius`,
  `background`, `box-shadow` from the deleted `SurfaceCard.module.css`.
- `apps/web/src/v3/observe/README.md` — remove the `_shared/` /
  `components/` line from the Layout tree (the comment named
  `SurfaceCard, CroppedArt, …` as primitives that no longer exist).

## Scope-correction note on the 2026-05-11 reskin ADR

The 2026-05-11 Human Context reskin ADR was titled *"Observe Human
Context reskin onto shared stageCard primitives"* and originally claimed
only Human Context had been migrated, with the other six modules
deferred. In practice the same session shipped the full seven-module
reskin. A scope-correction block has lived at the top of the 2026-05-11
ADR since today's earlier amendment; the body's *Migrated components*
and *Deferred follow-ups* sections already reflect the actual ship
(all 21 module files under `modules/**`). Today's deletion of the
`_shared/components/` primitives is the natural cleanup that the
post-amendment scope implies — the React primitive layer became dead
the moment every dashboard switched to direct `stageCard` consumption.

## Verification

- `pnpm --filter @ogden/web typecheck` clean.
- Preview at `/v3/project/demo/observe/{human-context,topography,macroclimate-hazards}`
  renders unchanged; AnnotationListCard's panel still shows the
  border + inset-green shadow it inherited from `SurfaceCard`.
- No module-resolution errors in the browser console after navigating
  through the three modules.
