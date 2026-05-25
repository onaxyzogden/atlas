# Header spine shows real Plan/Act % (drop the em dash)

**Date:** 2026-05-24
**Branch:** `feat/atlas-permaculture`

## What

Follow-up to [[log/2026-05-24-header-stage-spine]]. When the StageSpine moved into
the global header, a steward-locked choice had the **Observe** segment show its
real verified % while **Plan** and **Act** showed an em dash (`—`) — the dash was
retained because Plan/Act were believed to lack a header progress source. They no
longer do: the post-refactor compass gives each stage its own data hook
(`usePlanCompassData` / `useActCompassData`), each returning the same `.stage`
aggregate the Observe hook already feeds the spine. The steward directed the dash
be replaced with the real aggregate. **All three header segments now show a live
`%` from their own compass data.** Routing behaviour is unchanged — only the
readout changed.

This **supersedes locked decision #1** of the header-spine ADR (see its Addendum).

## How

- **`StageSpine`** — the `observeProgress: ObjectiveProgress` prop became
  `progressByStage: Record<Stage, ObjectiveProgress>`. The per-segment readout is
  now the uniform `` `${progressByStage[stage.id].pct}%` `` — the Observe-only
  special-case and the em-dash branch are removed. Still purely presentational;
  consumed only by `HeaderStageSpine`, so the prop-shape change is fully contained.
- **`HeaderStageSpine`** — imports and calls all three data hooks
  unconditionally (`useCompassData` / `usePlanCompassData` / `useActCompassData`;
  each calls its Zustand selectors + a single `useMemo` unconditionally →
  rules-of-hooks safe) **before** the off-route early return, then builds
  `progressByStage = { observe: observeData.stage, plan: planData.stage, act:
  actData.stage }` and passes it to the spine. The Observe-by-progress routing
  branch is unchanged (still reads `observeData.stage.pct >= 100`).

## Covenant

Pure presentation change — no schema, store action, data model, `MODULE_CARDS`,
or migration. Covenant grep over the edited files clean (no
riba/gharar/CSRA/salam/investor/financing/yield/ROI framing).

## Verification

`StageSpine.test.tsx` (6) + `HeaderStageSpine.test.tsx` (9 — one added asserting
each segment renders its own mocked %) green (15/15); em-dash assertions removed.
`tsc --noEmit` at the 3-error pre-existing baseline (`StepBoundary.tsx`
`ReactNode`; two `HostUnion*` test types). Explicit-path staging on
`feat/atlas-permaculture`, divergence-checked before push.

ADR: [[decisions/2026-05-24-atlas-header-stage-spine]] (Addendum).
