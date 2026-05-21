# 2026-05-21 — feat(atlas/biodiversity): habitat features → design elements, map-placeable, spine-wired (Slice 5 + ADR)

**Branch.** `feat/atlas-permaculture`. Closes the 2026-05-21 habitat-feature
unification plan ([`~/.claude/plans/habitat-features-need-a-lively-oasis.md`](../../wiki/decisions/2026-05-21-atlas-habitat-features-unification.md)).
Slices 1–4 had landed at HEAD before this session (Slice 4 via
`eda282d3`). This session ships **Slice 5** (D0 work-item spine seeder)
+ the **ADR**. Five micro-commits on a rebase-storm branch, committed the
moment each verified.

**What changed.**

- **Commit A (`f60a7eb3`)** —
  [packages/shared/src/schemas/workItem.schema.ts](../../packages/shared/src/schemas/workItem.schema.ts):
  add `'habitat-feature'` to the `WorkItemSource` enum + optional
  `generatedFromHabitatElement` provenance field on `WorkItemSchema`.
  Top-level `.passthrough()` + `.optional()` ⇒ no DB migration (A-series
  additive covenant).
- **Commit B (`9e6d4a3e`)** —
  [apps/web/src/store/workItemStore.ts](../../apps/web/src/store/workItemStore.ts):
  new `replaceHabitatFeatureRows(projectId, items)` action with override
  + cross-source preservation gate. 1:1 mirror of `replaceCoverCropRows`
  (swap `source`).
- **Commit C (`18231cb7`)** —
  [apps/web/src/features/biodiversity/habitatFeatureSpineSync.ts](../../apps/web/src/features/biodiversity/habitatFeatureSpineSync.ts)
  + colocated
  [tests](../../apps/web/src/features/biodiversity/__tests__/habitatFeatureSpineSync.test.ts).
  Pure `seedHabitatFeatureWorkItems` builder + side-effecting
  `pushHabitatFeaturesToSpine(projectId)`. Emits one stable
  `hf__<designElement.id>` WorkItem per habitat-category DesignElement
  (the 7 first-class kinds added in Slice 1 — `owl-box`, `raptor-perch`,
  `nest-box`, `brush-pile`, `snag`, `insectary-strip`, `wetland-edge`).
  Per-kind verb-led titles ("Install owl box", "Place raptor perch",
  …). 11 tests across provenance / pure builder / preservation-gate.
- **Commit D (`e865e68c`)** —
  [apps/web/src/v3/plan/PlanLayout.tsx](../../apps/web/src/v3/plan/PlanLayout.tsx):
  signature-keyed `useEffect` that re-pushes habitat-feature rows
  whenever the steward edits a habitat-category DesignElement. The
  signature (id+kind+phase, sorted) keeps the effect from re-firing on
  cosmetic re-renders.
- **Commit E (this entry)** —
  [wiki/decisions/2026-05-21-atlas-habitat-features-unification.md](../decisions/2026-05-21-atlas-habitat-features-unification.md).

**Posture.** Additive, ecologically-framed. No riba / gharar / CSRA /
salam / investor / financing / cost-of-capital framing. Stewardship
sovereignty preserved — the user places features; the system never
auto-infers them. Override-preservation contract held — steward-edited
WorkItems survive regeneration via the `overridden:true` flag.

**Verification.**

- `apps/web` typecheck — clean of new errors. Only pre-existing foreign
  errors remain (`StepBoundary.tsx(365,7)`, `TierChooser.tsx(12,*)`,
  `ObserveAnnotationLayers.tsx(895,28/900,28)`,
  `vegetationResolver.ts(86,29)`, `HostUnion*.test.tsx`).
- `packages/shared` vitest — 269/269 (schema + enum).
- `apps/web` `workItemStore.test.ts` — 23/23 (preservation regression
  check).
- `apps/web` `features/biodiversity` — 58/58 (11 new
  `habitatFeatureSpineSync` cases).
- Covenant grep — zero hits outside the explicit disclaimer line in
  `habitatFeatureSpineSync.ts`.

**Deferred.** D2 (resourcing) and D3 (costing) seeders for habitat
features — rows ship with empty `materialsAuto` / no `costRangeAuto`.
D1 predecessor auto-edges (e.g. "install owl box only after host tree
is planted") — habitat rows ride the existing engine without auto-edges.
Bespoke per-kind inline popovers, 3D GLB models, and full retirement of
the legacy `habitatFeatureStore` all remain deferred per the ADR's
scope decisions.
