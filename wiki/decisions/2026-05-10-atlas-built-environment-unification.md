# ADR — Unify Observe + Plan Built Environment behind a single store

**Date:** 2026-05-10
**Status:** Accepted (in-flight; supersedes the implicit Observe-vs-Plan split)
**Project:** Atlas (apps/web) — `feat/atlas-permaculture`

---

## Context

Two parallel built-environment systems evolved on opposite sides of the v3
permaculture stack:

| Side | Store | Kinds | Strengths | Gaps |
|---|---|---|---|---|
| Observe | `apps/web/src/store/builtEnvironmentStore.ts` | 8 (Building, Well, Septic, PowerLine, BuriedUtility, Fence, Gate, ExistingDriveway) | Per-kind taxonomy, descriptive metadata (depthM, flowLpm, surface, placement), turf-computed area/length | No 3D rendering; geometry editing structurally absent (kinds missing from `annotationGeometryRegistry.ts` dispatch tables) |
| Plan | `apps/web/src/store/structureStore.ts` + structure-class kinds of `apps/web/src/store/designElementsStore.ts` | 20 + 11 | Rich proposal-economic fields (cost, labor, material, demands, occupants, phase, enterprise), 3D via `DesignElementGlbLayer` + extrusion fallback, full vertex/drag/popover editing, zundo undo | One-way (proposed only); cannot describe found-on-site infrastructure |

The split was intentional ("descriptive vs prescriptive") but in practice:

- Duplicates schema across two stores with overlapping kinds (yurt, greenhouse,
  barn, well, water-tank, prayer-pavilion, fire-circle, compost — all exist
  on both sides under slightly different shapes).
- Prevents Observe's inventory of existing infrastructure from informing Plan's
  design constraints (a Plan barn cannot share a footprint with an Observe
  barn without manual re-entry).
- Starves Observe of the 3D + edit polish Plan already has.
- `designElementsStore` lacks an `update` method entirely — structure-class
  kinds placed there have never been editable post-placement, a long-standing
  data hazard.

A Phase 0 code-trace (this session) confirmed the geometry-edit gap on the
Observe side is structural, not a config oversight: all 8 BE kinds are absent
from `POINT_KINDS` / `LINESTRING_KINDS` / `POLYGON_KINDS` dispatch tables and
from `POINT_LAYER_IDS` in `AnnotationDragHandler`. Attribute editing via
`AnnotationFormSlideUp` works (FIELD_SCHEMAS does cover all 8), but the
position/shape cannot be moved once placed.

---

## Decision

Collapse Observe `builtEnvironmentStore`, Plan `structureStore`, and the
structure-class portion of `designElementsStore` into a single unified
`builtEnvironmentStoreV2`, keyed by `state: 'existing' | 'proposed'`.

The unified schema lives in `@ogden/shared`:

- `packages/shared/src/builtEnvironment.ts` — `BuiltEnvironmentEntity`
  with common base (id, projectId, kind, state, geometry, label, notes,
  createdAt, updatedAt, serverId?) + two optional metadata blocks
  (`existing` for descriptive fields, `proposed` for proposal-economic fields).
  Both blocks accepted on the schema regardless of state — per-kind helpers
  enforce required-by-state, additive evolution stays cheap.
- `packages/shared/src/builtEnvironmentKinds.ts` — canonical kind registry
  spanning the union of all three legacy systems. Every kind in the registry
  carries `defaultStates` (which the UI surfaces by default) and `validStates`
  (always both, at the schema level). The registry also carries 3D rendering
  hints (`renderMode: 'glb' | 'extrusion' | 'flat'`, `defaultHeightM`,
  `glbUrl`) so Plan's 3D layers can drive Observe entries without duplication.

Naming is kebab-case, matching `elementCatalog.ts`. Snake_case legacy names
(`tent_glamping`, `prayer_space`, `fire_circle`, `water_tank`, etc.) are
declared as aliases on their canonical specs; `canonicalizeKind()` resolves
them at migration time.

---

## Consequences

### Positive

- One source of truth for built-environment data across both stages.
- Observe inherits Plan's 3D rendering + edit polish via Phase 4 lift of
  `DesignElementGlbLayer` / `DesignElementExtrusionLayer` /
  `PlanVertexEditHandler` / `InlineFeaturePopover` into a shared
  `apps/web/src/v3/builtEnvironment/` directory.
- Plan inherits Observe's per-kind descriptive richness (subtype on Building,
  surface on Driveway, placement on PowerLine, etc.) — the `existing` metadata
  block is non-exclusive with `proposed`, so a Plan barn can carry measured
  `lengthM` from turf alongside `costEstimate`.
- Cross-stage queries are trivial: "all wells (existing + proposed) in this
  project" is one selector instead of two store reads.
- The `update`-method gap in `designElementsStore` closes automatically —
  structure-class kinds migrate into a store that has full CRUD.

### Negative / Risks

- LocalStorage migration of live MTC data is irreversible-feeling; mitigated
  by versioned migration shim that retains legacy keys read-only for one
  release (Phase 2.2).
- Mass call-site swap across Observe dashboards + Plan canvas is high-blast-
  radius; gated by `ATLAS_BUILT_ENV_V2` feature flag (Phase 3).
- zundo history is cleared on first v2 load — documented in release notes.
- `designElementsStore` retains water/grazing polygons (paddock, orchard,
  silvopasture, pasture-mix, pond, swale, etc.) — those are not
  "built environment" and stay where they are; only structure-class kinds
  migrate.
- The unified entity carries both `existing` and `proposed` blocks as
  optional. This is intentional (additive, lenient) but means callers must
  null-check when reading metadata; the per-state helpers in
  `builtEnvironment.ts` document the expected shape.

### Neutral

- Geometry constraint per kind (`geometryType: 'point'|'line'|'polygon'`)
  is enforced by `isGeometryValidForKind()` rather than by a Zod
  discriminated union — Zod's discriminator support does not extend to a
  second axis cleanly, and runtime validation is sufficient here.

---

## Alternatives considered

1. **Status quo with cross-store sync.** Build adapters that copy a Plan
   structure into Observe when "mark as built" is toggled, and vice-versa.
   Rejected: doubles the surface area and the schema drift problem stays.

2. **Two stores, shared schema in `@ogden/shared`.** Author one type, two
   Zustand stores that consume it. Rejected: the duplication moves from
   schema to store wiring; cross-stage selectors still need two reads.

3. **One store, no `state` axis — use `phase: 'observe'`.** Rejected: phase
   already means Yeomans phase (water/access/structure/...). Overloading it
   with stage semantics would pollute downstream consumers.

---

## Migration plan (summary — see plan file for full phases)

1. Author schema + kind registry + ADR (Phase 1 — this commit set).
2. Build `builtEnvironmentStoreV2` with migration shim from three legacy keys
   (`ogden-built-environment`, `ogden-structures`,
   `ogden-atlas-design-elements`) behind `ATLAS_BUILT_ENV_V2` flag
   (Phase 2).
3. Swap read sites + draw tools behind flag; verify parity on MTC (Phase 3).
4. Lift Plan's 3D layers + edit handlers to `apps/web/src/v3/builtEnvironment/`
   and mount in Observe (Phase 4).
5. Surface Plan-only kinds in Observe draw rail and vice-versa (Phase 5).
6. Flip flag default-on, delete legacy stores, tsc/test/lint sweep (Phase 6).

---

## References

- Plan file: `C:\Users\MY OWN AXIS\.claude\plans\need-to-discuss-difference-composed-quill.md`
- Schema: `packages/shared/src/builtEnvironment.ts`
- Kind registry: `packages/shared/src/builtEnvironmentKinds.ts`
- Legacy Observe store: `apps/web/src/store/builtEnvironmentStore.ts`
- Legacy Plan stores: `apps/web/src/store/structureStore.ts`, `apps/web/src/store/designElementsStore.ts`
- Phase 0 code-trace (this session): all 8 Observe BE kinds absent from
  `annotationGeometryRegistry.ts` dispatch tables → geometry editing
  structurally absent; attribute editing works via `FIELD_SCHEMAS`.
