# 2026-05-10 — Phase 4.4: BE schema registry (option enum dedup)


Created [apps/web/src/v3/builtEnvironment/schemas/beSchemaRegistry.ts](../apps/web/src/v3/builtEnvironment/schemas/beSchemaRegistry.ts)
as the single source of truth for the dropdown option enums, titles,
and defaults of the eight built-environment kinds — closing Phase 4
step 4.4 of the BE unification ADR.

**Why this scope (deliberately narrow):**
Building's schema diverges deeply between Observe (3 metadata fields:
subtype/label/notes) and Plan (8 fields incl. proposed-state design
intent: phase, rotation, width, depth, height — plus footprint
regeneration on dim/rotation change). Collapsing the full field
arrays into one source would couple the two flows and risk regressing
Plan's geometry round-trip. Instead, the registry holds the
**catalog** (`coreFields`, `planOnlyFields`, `defaults`, option
enums) and each adapter renders its own form shape, but both pull
from the same option arrays — which is where the drift was
happening.

**Inconsistencies surfaced and resolved:**
- Driveway surface enum diverged: Observe had
  `gravel|paved|dirt|other`; Plan had `gravel|asphalt|concrete|dirt
  |other`. Registry takes the union with `paved` retained as a
  read-only legacy umbrella value, and `DrivewaySurface` in
  `apps/web/src/store/builtEnvironmentStore.ts` widened to match.
  Existing rows with `surface === 'paved'` keep rendering; new
  selections choose asphalt or concrete.
- Field identifier `kind` vs `subtype`: both write to V2
  `existing.subtype`. The Observe slide-up keeps the form key
  `kind` for backward compat with its rendering layer, but the
  registry exposes the canonical name `subtype`.
- Building subtype / phase options had an empty sentinel in Plan
  (`'— unspecified —'`, `'Unassigned'`) used only when editing an
  existing record without that field set. Plan prepends the sentinel
  at construction; the registry stays the four-value catalog.

**Files touched:**
- new: `apps/web/src/v3/builtEnvironment/schemas/beSchemaRegistry.ts`
  (~260 LOC) — `BeKind`, `BeOption`, `BeField`, `BeSchema`,
  per-kind schema constants, `BE_SCHEMA_REGISTRY`, named exports
  for each option enum.
- `apps/web/src/v3/plan/layers/inlineEditSchemas.ts` — replaced
  eight inline option-array `const` declarations with re-exports
  from the registry; Building keeps its sentinel-prepending wrapper.
- `apps/web/src/v3/observe/components/draw/annotationFieldSchemas.ts`
  — same substitution for the eight BE kinds; field declarations
  collapse from 9-line inline `options: [ … ]` blocks to one-line
  `options: BE_<KIND>_OPTIONS` references.
- `apps/web/src/store/builtEnvironmentStore.ts` — `DrivewaySurface`
  widened to `gravel|asphalt|concrete|paved|dirt|other` for the
  legacy-compat reasons above.

**Verification:**
- `NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit` from
  `apps/web` → exit 0.
- `npx vitest run src/store/__tests__/builtEnvironmentAdapters.test.ts`
  → 16/16 pass.

**Out of scope (deferred to Phase 5):**
- Subsuming the V1 facade `add*`/`update*` save paths into V2
  directly — Observe still goes through `useBuiltEnvironmentStore`.
- Unifying the `FieldDef` (Observe) vs `FieldSpec` (Plan) field
  shape; the registry keeps a superset `BeField` that either
  adapter can narrow to.
- Migrating non-BE kinds (Zone, Crop, Path, Paddock, WaterNode, …)
  to a registry. They're not duplicated today.
