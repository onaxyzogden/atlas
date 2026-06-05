# 2026-05-15 — Zone-generator seam + ring-seeded editable zones


**Context.** A steward questioned whether hand-drawn zones and the
read-only Mollison ring overlay were redundant. They are not (rings =
visit-frequency gradient, distinct from land-use category), but the
overlay was read-only, so a blank canvas still meant tracing every zone
by hand, and `GenerateSiteDesignBar` hard-required ≥1 zone — a zero-zone
project was a dead end.

**Change.** New pure seam
`apps/web/src/v3/plan/engine/zoneGenerators/` (`types.ts`,
`ringSeedGenerator.ts`, `index.ts` registry): `(context) → LandZone[]`,
no store/React; caller `addZone`s the result so seeds ride the existing
`temporal` undo + draw/edit tools. `ringSeedGenerator` anchors on an
explicit `isHomeCentre` zone → legacy Z0 → parcel centroid (emits a
home-centre disc when none), clips Z1/Z2/Z3 to the parcel,
subtracts existing zones, is idempotent per Z-level, drops <50 m²
slivers. Single-source extractions: ring geometry →
`zoneRingConstants.ts` (`PlanZoneRingsOverlay` imports it),
`Z_TO_CATEGORIES`/`defaultCategoryForZ` → `zoneStore`
(`ZonePolygonTool` reads it); `LandZone` gained optional
`isHomeCentre`/`seedProvenance` (no persist bump).
`GenerateSiteDesignBar` now itemizes missing prerequisites and shows a
zero-state "Seed zones from rings" button. Archetype→category biasing
left as a documented hook (no source data in `planProjectTypeTemplates`).

**Verification.** `vitest run src/v3/plan/engine/zoneGenerators` 5/5
green; `tsc --noEmit` (full web, 8 GB heap) exit 0; preview (`mtc`, Goal
Compass → Proposal) — button renders in the zero-state, click invokes
the generator and correctly surfaces `canRun`'s parcel-boundary reason
(mtc has no boundary); only console noise is a pre-existing unrelated
`<button>`-in-`<button>` warning in `ObserveModuleBar.tsx:32`.

**Deferred.** Typo-reword force-push of `cbb08e15` (blocked on explicit
authorization — local rewrite done); in-canvas tool-rail "Drop home
centre" / "Seed zones" actions; dashed seeded-draft map styling. See ADR
`decisions/2026-05-15-atlas-zone-generator-seam-ring-seeding.md`.
