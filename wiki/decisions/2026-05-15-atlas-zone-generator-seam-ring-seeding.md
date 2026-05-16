---
title: Zone-generator seam + ring-seeded editable zones
date: 2026-05-15
status: accepted
stage: plan
module: goal-compass / zone-generators
---

# ADR: Zone-generator seam + ring-seeded editable zones

**Date:** 2026-05-15
**Status:** accepted

## Context

A steward asked whether hand-drawn `LandZone`s and the read-only Mollison
ring overlay were redundant. They are not — the rings encode a
frequency-of-visit gradient (Z0 home centre → Z3, distinct from land-use
category), but the overlay was *read-only*: a steward facing a blank
canvas still had to trace every zone by hand from the ideal the overlay
was already drawing. The "Generate site design" Auto-Design bar also
hard-required ≥1 zone, so a zero-zone project was a dead end with only a
vague prompt.

Two latent single-source-of-truth hazards compounded this: the ring band
radii lived as a private array inside `PlanZoneRingsOverlay`, and a
Z-level→category table was duplicated inside `ZonePolygonTool`. Any new
"stamp draft zones" feature would have had to re-derive both.

## Decision

**1. A pure zone-generator seam.** New
`apps/web/src/v3/plan/engine/zoneGenerators/` — `types.ts`
(`ZoneGenerator` = `id`/`label`/`describe`/`canRun(ctx)`/`generate(ctx)`,
context = `projectId` + nullable `parcelBoundary` FC + `existingZones` +
reserved `archetype`), `ringSeedGenerator.ts`, and an `index.ts` registry
(`getZoneGenerator`/`runZoneGenerator`). A generator is a **pure
function** `(context) → LandZone[]` — no store, no React. The caller
`addZone`s the result, so every generated zone rides the existing
`temporal` (undo) store and the existing draw/edit tools with zero new
editor code. Parcel-fill / template / AI generators plug into the same
interface and the same provisional-review surface later.

**2. `ringSeedGenerator`.** Anchor resolution (in order): an explicit
`isHomeCentre` zone → a legacy `permacultureZone === 0` zone → the
parcel-boundary centroid. When no home-centre zone exists one is emitted
(a small disc at the anchor), closing the original "no zones at all"
zero-state in one action. Each Z1/Z2/Z3 band is clipped to the parcel and
has existing zones (hand-drawn + home + earlier bands) subtracted, so
seeds never overlap and a re-run only fills the still-uncovered remainder
(idempotent per Z-level — a level already `seedProvenance==='ring-seed'`
is skipped). `MIN_SEED_AREA_M2 = 50` drops slivers.

**3. Single-source extractions.** Ring geometry moved to
`apps/web/src/v3/plan/layers/zoneRingConstants.ts` (`ZONE_RING_BANDS`,
`ringCircle`); `PlanZoneRingsOverlay` now imports it, so a seed's outer
edge lands exactly on its overlay ring. `Z_TO_CATEGORIES` +
`defaultCategoryForZ` moved into `zoneStore` (the store that owns
`ZoneCategory`); `ZonePolygonTool` reads the shared table. `LandZone`
gained optional `isHomeCentre?: boolean` and `seedProvenance?:
'manual' | 'ring-seed'` — additive, **no persist version bump**.

**4. Zero-state shortcut.** `GenerateSiteDesignBar` renders a "Seed
zones from rings" button only when the project has 0 zones, wired through
`ringSeedGenerator.canRun`/`.generate` → `addZone`, with a steward-facing
status line (either a seeded count or `canRun`'s reason).

Archetype-aware defaults were left as a documented hook (identity =
`defaultCategoryForZ`): `planProjectTypeTemplates` carries **no**
archetype→zone-category data, so fabricating one would have created a
second source of truth. Deferred until that data exists.

## Consequences

- Seeded zones are ordinary editable `LandZone`s — undo, drag-edit, and
  dismiss all work for free; no new editor surface to maintain.
- The ring overlay and seed geometry can no longer drift apart (shared
  constants).
- Future generators (parcel-fill, template, AI) are an additive registry
  entry, not a re-architecture.
- `ringSeedGenerator` only needs a drawn parcel boundary (or a
  home-centre) — no longer a hard dependency on pre-existing zones.

## Files changed

- **New:** `apps/web/src/v3/plan/engine/zoneGenerators/{types,ringSeedGenerator,index}.ts`
  + `__tests__/ringSeedGenerator.test.ts`;
  `apps/web/src/v3/plan/layers/zoneRingConstants.ts`.
- `apps/web/src/v3/plan/layers/PlanZoneRingsOverlay.tsx` — imports shared
  ring constants (local `RINGS` array removed).
- `apps/web/src/store/zoneStore.ts` — `Z_TO_CATEGORIES`,
  `defaultCategoryForZ`, `ZoneSeedProvenance`; `LandZone.isHomeCentre`,
  `LandZone.seedProvenance` (both optional).
- `apps/web/src/v3/plan/draw/tools/ZonePolygonTool.tsx` — reads shared
  `Z_TO_CATEGORIES` (local copy deleted).
- `apps/web/src/v3/plan/cards/goal-compass/GenerateSiteDesignBar.tsx` —
  itemized missing-prerequisite hint + zero-state "Seed zones from
  rings" button/handler.

## Verification

- `vitest run src/v3/plan/engine/zoneGenerators` — **5/5 green**
  (canRun-false with no anchor; zero-state emits home + Z1/Z2/Z3 with
  strictly increasing areas; bands stay inside parcel; idempotent per
  Z-level; reuses an existing home-centre zone).
- `tsc --noEmit` (full web project, 8 GB heap) — clean, exit 0.
- Preview (`mtc`, Goal Compass → Proposal): "Seed zones from rings"
  button renders in the zero-state alongside "Generate site design";
  click invokes the generator and correctly surfaces `canRun`'s "Draw
  the parcel boundary (or drop a home centre)…" reason as status (mtc
  has no boundary). Only console errors are a pre-existing, unrelated
  `<button>`-in-`<button>` warning in `ObserveModuleBar.tsx:32`.

## Scope / non-goals

Plan only. Snapshot/anchor semantics of the read-only ring overlay are
unchanged. Archetype→category biasing deferred (no source data). Pending
separately: the typo-reword force-push of `cbb08e15` (blocked on explicit
authorization); in-canvas tool-rail "Drop home centre" / "Seed zones"
actions; dashed seeded-draft map styling.
