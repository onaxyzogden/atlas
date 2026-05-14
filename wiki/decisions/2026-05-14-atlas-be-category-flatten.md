# 2026-05-14 — Atlas BE category flatten in Observe & Plan rails

## Status
Accepted (implemented).

## Context

The Built Environment (BE) registry exposes 31 kinds across 9 categories
(`building`, `agricultural`, `utility`, `infrastructure`, `machinery`,
`amenity`, `vegetation`, `earthworks`, `zone-marker`). Until today these
surfaced in both Observe (`built-environment` module) and Plan
(`structures-subsystems` module) as a *single* rail section with 9 nested
`<details>` sub-cards.

With 31 kinds inside one parent section, BE dominated the rail and pushed
the other Observe / Plan modules out of view. The steward asked for each
BE category to become its own top-level rail section — parallel to how
Sectors and SWOT each occupy their own section — and the right-rail
guidance aside to mirror that shape. Clicking a category section should
activate a pre-existing module (not a new module ID) so slide-ups,
telemetry, and `MODULE_CARDS` stay stable.

## Decision

### Visual flatten (no module-ID changes)

- `OBSERVE_MODULES` and `PLAN_MODULES` are **not** extended. BE
  sub-categories are visual-only; they piggyback on existing module IDs
  for click-routing.
- BE toolIds (`observe.built-environment.<kind>` /
  `plan.structures-subsystems.be.<kind>`) are **unchanged**, so the BE
  entity store / draw pipeline / inline-edit schemas are untouched.
- The parent `built-environment` (Observe) and `structures-subsystems`
  (Plan) rail rows are hidden after extraction. The parent slide-ups
  remain reachable via the bottom-rail module tile.

### Category → module click-routing

| BE Category   | Observe module routed       | Plan module routed       |
|---------------|------------------------------|---------------------------|
| Buildings     | `built-environment`          | `structures-subsystems`   |
| Agricultural  | `built-environment`          | `structures-subsystems`   |
| Utilities     | `built-environment`          | `structures-subsystems`   |
| Infrastructure| `built-environment`          | `zone-circulation`        |
| Machinery     | `built-environment`          | `machinery`               |
| Amenities     | `built-environment`          | `structures-subsystems`   |
| Vegetation    | *(suppressed — see below)*   | *(suppressed)*            |
| Earthworks    | *(dropped — see below)*      | *(dropped)*               |
| Zone markers  | `sectors-zones`              | `zone-circulation`        |

### Vegetation suppression

The native Plan `plant-systems` rail section already carries Oak / Pine
/ Apple / Shrub / Hedgerow as first-class plant tools (ported from
elementCatalog 2026-05-11). The duplicate Vegetation BE rail section
was redundant in both stages and has been removed. Mature trees /
shrubs surface via the native plant tools (Plan) or via the
`earth-water-ecology` ecology workflow (Observe).

### Earthworks redistribution

The 3 earthworks kinds were redistributed into more semantically
appropriate sections rather than living in a 3-item Earthworks BE
section:

| Kind        | Observe surface                          | Plan surface             |
|-------------|-------------------------------------------|--------------------------|
| Terrace     | Amenities BE section                      | Amenities BE section     |
| Berm        | Earth-Water-Ecology (native rail)         | Water Management (native) |
| Raised bed  | Earth-Water-Ecology (native rail)         | Plant Systems (native)   |

These tools dispatch their existing BE toolIds (e.g.
`plan.structures-subsystems.be.berm`) so the BE draw / persistence
pipeline still handles them — only the rail-section grouping changed.
The standalone Earthworks BE rail section and its right-rail guidance
card are gone.

### Right-rail guidance aside

- `BE_CATEGORY_GUIDANCE` map added to
  `apps/web/src/v3/_shared/builtEnvironmentTools.ts` with Scholar-grounded
  WHY / HOW / Pitfall copy for the 7 surviving BE categories
  (Yeomans' Scale of Permanence, Mollison Designer's Manual, OSU PDC
  tone matching the existing `MODULE_GUIDANCE`).
- Observe and Plan checklist asides render the original module guidance
  cards followed by 7 BE category guidance cards. Vegetation /
  Earthworks cards are filtered out to match the rail.

## Consequences

- The Observe rail now shows 6 OBSERVE module sections + "Adopt from
  map" standalone + 7 BE category sections (Buildings, Agricultural,
  Utilities, Infrastructure, Machinery, Amenities, Zone markers).
- The Plan rail shows 10 PLAN module sections + 7 BE category sections.
- Sections with the same routed module light up together when active
  (`aria-pressed="true"`) — acceptable; mirrors the routing intent.
- The BE registry (`packages/shared/src/builtEnvironmentKinds.ts`) is
  **not** modified — the redistribution of berm / raised-bed / terrace
  is rail-side only. If a future change wants to formalise the
  earthworks split in the registry itself, the rail-side filters in
  `Plan/Observe Tools.tsx` and `*ChecklistAside.tsx` can be deleted.

## Files touched

- `apps/web/src/v3/_shared/builtEnvironmentTools.ts` — added
  `BE_CATEGORY_GUIDANCE`.
- `apps/web/src/v3/observe/tools/ObserveTools.tsx` — flatten + EWE
  inline insertions (berm / raised-bed) + amenity terrace insertion.
- `apps/web/src/v3/plan/PlanTools.tsx` — same shape; water-management
  picks up berm, plant-systems picks up raised-bed, amenity picks up
  terrace.
- `apps/web/src/v3/observe/components/ObserveChecklistAside.tsx` —
  9 → 7 BE category guidance cards.
- `apps/web/src/v3/plan/PlanChecklistAside.tsx` — same.

## Verification

- `npm run typecheck` — clean (`tsc --noEmit` with 8GB heap).
- `npm test` — 710 / 710 passing across 47 files; no BE toolId tests
  affected (toolIds unchanged).
- Manual preview verification on both Plan and Observe rails:
  category sections render in registry order, native sections
  correctly carry the relocated tools, BE draw pipeline still arms on
  click.
