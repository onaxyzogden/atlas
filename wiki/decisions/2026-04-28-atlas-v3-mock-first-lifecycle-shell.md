# Atlas v3.0 — Mock-first Lifecycle Shell

**Date:** 2026-04-28
**Branch:** `feat/atlas-3.0`
**Status:** Implemented

## Context

Atlas v2.1 was a tab-based project workspace organized around the map.
The seven reference screens (Project Command Home, Discover, Diagnose,
Design Studio, Prove, Operate, Feasibility Command Center) define a
different product: a calm, decision-first system organized around the
project lifecycle, not the map. The v3 brief prescribed three
non-negotiable rules:

1. **Mock everything first** — frontend in isolation, no API calls.
2. **Don't start with the map** — Design Studio is built last.
3. **Every page answers what's happening / what's wrong / what next.**

Plus RULE 4 (right rail always useful).

## Decision

Rebuild Atlas as a parallel `/v3/...` route tree under
[`apps/web/src/v3/`](../../apps/web/src/v3/), reusing the existing
`LandOsShell` + decision tokens, and reading from a single fixture via
[`useV3Project`](../../apps/web/src/v3/data/useV3Project.ts). The v2
`/project/$projectId` workspace stays mounted; cutover is deferred to
v3.1 once the live map and backend land.

### Key choices

- **Parallel route tree, not in-place rewrite.** v3 lives at
  `/v3/project/:id/{home,discover,diagnose,design,prove,build,operate,report}`.
  Allows side-by-side comparison and zero-risk rollback.
- **Single adapter (`useV3Project`)** is the only place v2 stores
  meet v3 components. Pages never import from Zustand directly. Lets
  v3.1 swap the source from fixture → API in one place.
- **Generic `DecisionRail`** with one rail component per stage
  ([`components/rails/`](../../apps/web/src/v3/components/rails/))
  enforces RULE 4 — every route gets stage-appropriate panels by
  construction.
- **Static-SVG placeholders** for the live field map (Operate) and
  Design Studio canvas — same SVG language across both, no MapboxGL
  imports anywhere in v3 until v3.1 lifts RULE 2.
- **Print-styled Report** uses native `window.print()` +
  `@media print` rather than a PDF lib — keeps v3.0 dependency-clean;
  PDF export deferred.

### What was rejected

- **Forking the v2 decision cards** to a v3 namespace. They were
  general enough (`VerdictCard`, `BlockingIssueCard`, `ScoreMetric`)
  to reuse with thin wrappers; only `BlockerCard` needed a v3 variant.
- **Building Design Studio first.** Tempting because it's the most
  visual, but the brief explicitly orders it last to keep the team
  out of the map until the lifecycle scaffold is real.

## Consequences

**Positive.**
- All 7 lifecycle stages render end-to-end against one fixture; demos
  walk cleanly through MTC Teaching Farm without API or map deps.
- v3.1 has a clean seam: replace the fixture in `useV3Project` with a
  fetch hook; everything downstream lights up.
- `npm run build` stays clean; no MapboxGL import on any v3 route.

**Negative.**
- Two project workspaces live in the codebase until cutover; double
  navigation surface area.
- Some CSS-module dynamic class lookups surface `string | undefined`
  in `tsc --noEmit`; tracked in the v3.1 backlog.
- Six fixture scores aren't reconciled with the existing
  `packages/shared/src/scoring` engine; reconciliation is a v3.1 task.

## References

- Plan: `feat/atlas-3.0` plan (approved 2026-04-28).
- Backlog: [`apps/web/src/v3/BACKLOG-v3.1.md`](../../apps/web/src/v3/BACKLOG-v3.1.md).
- Top commit: `b503b16`.
