# ADR: Resolve `TransectVerticalRef` non-standalone kinds

**Date:** 2026-04-30
**Status:** accepted
**Branch:** `feat/atlas-permaculture`
**Predecessor:** [`2026-04-30-site-annotations-store-scholar-aligned-namespaces.md`](2026-04-30-site-annotations-store-scholar-aligned-namespaces.md)
  — introduced the `TransectVerticalRef` discriminated-union schema with
  `kind: 'standalone' | 'water-system' | 'polyculture' | 'closed-loop' | 'structure'`
  but deferred resolution of the four non-standalone kinds.

## Context

The 2026-04-30 namespace-consolidation ADR widened
`Transect.verticalElements` (inline copies) to
`Transect.verticalRefs: TransectVerticalRef[]` (discriminated refs into
domain stores) per Holmgren P8. Resolution of
`kind !== 'standalone'` refs was explicitly deferred — the migration shipped
with `TransectVerticalEditorCard` rendering only `kind === 'standalone'`
pins and silently skipping the other four kinds. This ADR closes that
deferral.

## Decision

`TransectVerticalEditorCard` now subscribes to the four domain stores +
`structureStore` and exposes both:

1. **A render path that resolves all four non-standalone kinds** at draw
   time, surfacing the linked element's height + label.
2. **A "Link to existing element" affordance** in the add-element form,
   alongside the existing "Standalone sketch" mode.

### Resolution table

| `ref.kind` | Domain store(s) | Height source | Label source |
|---|---|---|---|
| `standalone` | (inline `ref.standalone`) | `standalone.heightM` | `standalone.label` |
| `water-system` | `useWaterSystemsStore` (earthworks ∪ storageInfra) | type-default lookup (swale 0.5 m, diversion 0.5 m, french_drain 0.3 m, cistern 2.5 m, pond 1.0 m, rain_garden 0.5 m) | `notes ?? type` |
| `polyculture` | `usePolycultureStore` (guilds ∪ species) | guild → anchor species `matureHeightM` from `PLANT_DATABASE`; species → species `matureHeightM` | guild → `name`; species → `commonName` |
| `closed-loop` | `useClosedLoopStore` (fertilityInfra) | type-default lookup (composter 1.5 m, hugelkultur 1.2 m, biochar 0.8 m, worm_bin 0.5 m) | `notes ?? type` |
| `structure` | `useStructureStore` | `Structure.heightM ?? 3` | `Structure.name ?? type` |

**Default heights** for water-system + closed-loop kinds are inlined
(small typed `Record` lookups) because the domain stores intentionally
don't carry per-instance heights — those types describe horizontal
infrastructure whose vertical extent is uniform within a type. Solar
overlay clip-heights remain a coarse approximation; the card already
clamps `drawH = min(120, h * 4)` so a missing-resolution fallback (0.5 m
or 1 m by kind) keeps the UI rendering even on stale `refId`s.

Plant heights come from `apps/web/src/data/plantDatabase.ts`
(`PlantSpecies.matureHeightM`); the resolver looks up the species record
once via `find()` per ref. With <100 species rows and the resolver
memoized over `[earthworks, storage, guilds, species, fertility, structures]`,
this is comfortably under any render budget.

### Missing-ref handling

If `refId` no longer resolves (the linked element was deleted), the card:

- Renders the SVG triangle at a kind-default height with a `(missing X)`
  label.
- Shows the elements-list row with the title in amber (`rgba(220,140,100,0.95)`)
  prefixed by `⚠`, and prints `—` for the height column.

No automatic deletion of orphaned refs — same convention as
`actualsStore` ↔ `phaseStore.tasks` (audit trail; manual cleanup via
the Remove button).

### Add-form: dual mode

The add-element form gains a radio toggle:

- **Standalone sketch** (default; preserves today's UX) — same `Type` /
  `Distance` / `Height` / `Label` inputs, creates `kind: 'standalone'`.
- **Link to existing element** — `Namespace` dropdown
  (`water-system | polyculture | closed-loop | structure`) +
  `Element` dropdown populated from the project-filtered store contents,
  + `Distance` input. Creates `{ kind, refId }` with no inline payload.

Empty-state messaging is per-kind: when a project has no earthworks /
guilds / species / fertility / structures, the dropdown is replaced with
"No <namespace> elements in this project yet." and the Add button is
disabled while `linkRefId` is empty.

### Triangle color coding

Each ref kind gets a distinct fill/stroke pair on the SVG profile to
make the cross-section legible at a glance:

- standalone — amber (existing)
- water-system — blue
- polyculture — green
- closed-loop — brown
- structure — grey

## Consequences

**Positive**
- The cross-section now reflects live design state — moving a guild's
  anchor species or editing a structure's `heightM` reflows the transect
  next render.
- No data duplication: the inline `verticalElements` copy that the v3
  → v4 migrator transformed away is now fully unnecessary. Stewards can
  link a tree once into a `species` pick and reference it from any
  number of transects.
- Solar-overlay decisions get more accurate inputs (anchor-species
  mature heights vs. hand-typed standalone heights).
- Closes the only remaining deferred follow-up from
  [`2026-04-30-site-annotations-store-scholar-aligned-namespaces.md`](2026-04-30-site-annotations-store-scholar-aligned-namespaces.md).

**Risks accepted**
- Cross-store render dependencies: the card now imports 5 stores
  (topography + waterSystems + polyculture + closedLoop + structure).
  Selector discipline preserved — each store contributes one raw-array
  read + one project-filter `useMemo`. No inline filter-in-selector.
- Default heights for water-system / closed-loop infrastructure are
  type-keyed constants rather than per-instance fields. If stewards
  want to override a particular cistern or composter height, they can
  fall back to a `kind: 'standalone'` pin with a manual height. A future
  ADR could add an optional `heightM` field to the relevant types.
- Missing refs render as soft warnings rather than auto-removing — same
  convention as the rest of the codebase's cross-store invariants.

**Out of scope**
- Adding `heightM` to `Earthwork` / `StorageInfra` / `FertilityInfra` —
  only land if stewards request per-instance overrides.
- Drag-to-reorder vertical elements; drag-to-edit distance directly
  on the SVG. Today's flow is form-based.
- Scaling tree triangles to canopy width (matureWidthM) for shadow
  estimation. Solar overlay is still a single-line altitude check.

## Verification

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` — clean.
- `npx vite build` — clean (24.58 s; PWA precache 565 entries).
- Pre-existing `computeScores.test.ts` failures untouched.
- Manual walkthrough deferred to next steward session — all changes are
  scoped to one card; no migrations / no schema changes.

## Files touched

**Modified (1):**
- `apps/web/src/features/plan/TransectVerticalEditorCard.tsx` — full
  rewrite of the resolver path, render path, and add-form. ~230 → ~430
  lines.

**Wiki:**
- `wiki/decisions/2026-04-30-transect-vertical-ref-resolver.md` — this ADR.
- `wiki/decisions/2026-04-30-site-annotations-store-scholar-aligned-namespaces.md` —
  "Out of scope" deferred-followup line struck through (now landed).
- `wiki/index.md` — ADR row added.
- `wiki/log.md` — session entry filed.
