# 2026-05-21 — feat(atlas/biodiversity): habitat-feature Slice 6 — D2 materials + D3 cost band + economics rollup

**Branch.** `feat/atlas-permaculture`. Closes the D2/D3 deferral recorded
on [`wiki/decisions/2026-05-21-atlas-habitat-features-unification.md`](../decisions/2026-05-21-atlas-habitat-features-unification.md).
Two micro-commits on the active rebase-storm branch, committed the moment
each verified.

**What changed.**

- **Commit S6-A (`3d9638f8`)** —
  [`apps/web/src/features/biodiversity/habitatFeatureCatalog.ts`](../../apps/web/src/features/biodiversity/habitatFeatureCatalog.ts):
  new 7-entry catalog table driving the D2 BOM writes. Discriminated
  `HabitatSource` union (`nrcs-practice` with CP-code | `extension` with
  named org) + `HabitatFeatureCatalogEntry` interface +
  `habitatElementScale` / `scaledCostBand` / `scaledMaterials` helpers.
  Per-kind values: owl-box (point, 1.5hr, $15/45/150, Cornell NestWatch
  + CP649), raptor-perch (point, 1.0hr, $25/60/180, Audubon + CP649),
  nest-box (point, 0.75hr, $10/25/75, Cornell NestWatch), brush-pile
  (point, 1.5hr, $0/0/30, NRCS-WHC, empty kit), snag (point, 0.25hr,
  $0/0/0, USFS, empty kit), insectary-strip (line, 0.05hr/m, $0.5/1.2/3.0
  per m, Xerces + UC IPM), wetland-edge (polygon, 0.02hr/m², $0.3/0.75/2.5
  per m², CP657 + Audubon).
  [`habitatFeatureSpineSync.ts`](../../apps/web/src/features/biodiversity/habitatFeatureSpineSync.ts)
  extended to compute + write `materialsAuto` per element and to export
  a new `seedHabitatFeatureResources({items, designElements, catalog?})`
  public helper mirroring the cover-crop shape (Map<id, {equipment,
  materials}>). 26 new catalog tests + 6 spine-sync D2 cases.
- **Commit S6-B (`25519a20`)** —
  [`apps/web/src/features/biodiversity/habitatFeatureEconomicsMath.ts`](../../apps/web/src/features/biodiversity/habitatFeatureEconomicsMath.ts):
  new `computeHabitatFeatureProgramEconomics({items, designElements,
  catalog?})` pure rollup returning project totals (`totalLaborHrs`,
  `totalCostRange`) and a per-kind `Map<HabitatFeatureKind, {count,
  laborHrs, costRange}>`. Mirrors `coverCropEconomicsMath` discipline —
  pure, injectable catalog, items missing provenance / catalog entry
  silently omitted (B4/B5 "omitted-not-stubbed" precedent).
  `seedHabitatFeatureWorkItems` extended to also write `costRangeAuto`
  and `laborHrs` per element (geometry-scaled for line/polygon kinds);
  new `seedHabitatFeatureCosts(...)` exported helper. +7
  economics-math tests + 8 spine-sync D3 cases.

**ADR addendum.** [`wiki/decisions/2026-05-21-atlas-habitat-features-unification.md`](../decisions/2026-05-21-atlas-habitat-features-unification.md)
"D2/D3 deferred" bullet struck through; replaced with closure note
referencing the catalog + economics math + structured-citation backbone.

**Verification.**

- `cd apps/web && npx vitest run src/features/biodiversity` — **107/107
  green** (was 92 before Slice 6; +15 cases across catalog + spine-sync
  D2/D3 + economics math).
- `cd apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
  — only pre-existing foreign errors remain (StepBoundary,
  ObserveAnnotationLayers, vegetationResolver, HostUnion tests). No new
  errors from Slice 6.
- Covenant grep `\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b/i`
  across the three new/modified files — all hits inside disclaimer or
  test-policy lines.
- `git fetch origin feat/atlas-permaculture` — clean 1-ahead/0-behind
  before each push.

**Posture.** A-series additive — `WorkItem.costRangeAuto`,
`WorkItem.laborHrs`, `WorkItem.materialsAuto` were already in the
shared schema with `.passthrough()`. No migration, no breaking change.
D3 stays strictly project cost / labor — no riba / gharar / CSRA /
salam / investor / financing / cost-of-capital semantics; financing
remains Sub-project C, Scholar-gated.

**Deferred (still).**

- D1 predecessor auto-edges (e.g. install owl-box after host tree
  planted) — out of scope; cleanest seam is a
  `habitatMetadata.hostTreeFeatureId → dependsOnAuto` projection that
  requires schema-level wiring not in place yet.
- Region-specific cost adjustment — Slice 6 ships national-average
  bands; per-region overrides are a future refinement.
- Full retirement of legacy `habitatFeatureStore` — separate ADR once
  branch stability returns.
- UI surfacing of `HabitatSource[]` — the data is authored; a future
  "show citations" panel can consume it.

**Rebase-storm discipline.** Two micro-commits, each pushed
immediately after `git fetch` divergence check returned 1-ahead /
0-behind. The transient contamination from already-staged foreign
`v3/pages/*` deletions in the first S6-B commit attempt was caught
by `git status --short` review pre-push and undone with `git reset
--soft HEAD~1 && git restore --staged …`; the clean re-commit
contains only the five intentional files.
