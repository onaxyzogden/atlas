# 2026-05-14 — BE category flatten in Observe & Plan rails


Built Environment registry (31 kinds across 9 categories) was previously
collapsed into a single rail section in both Observe and Plan, dominating
the rail. Flattened so each `BuiltEnvironmentCategory` becomes its own
top-level rail section — parallel to how Sectors / SWOT each occupy their
own section — and the right-rail guidance aside mirrors that shape with
per-category WHY / HOW / Pitfall cards grounded in Yeomans / Mollison /
OSU PDC. Each category section click-routes to a pre-existing module so
slide-ups, telemetry, and `MODULE_CARDS` stay stable; no new module IDs
were introduced. BE toolIds (`observe.built-environment.<kind>` /
`plan.structures-subsystems.be.<kind>`) are unchanged, so the BE entity
store / draw pipeline / inline-edit schemas are untouched.

Per steward feedback during the session, two further reductions:
**Vegetation** BE rail section was removed — Oak / Pine / Apple / Shrub /
Hedgerow already surface as first-class plant tools under Plan's native
`plant-systems` section, and as the EWE ecology workflow in Observe. The
3-item **Earthworks** section was dissolved: Terrace was appended to the
Amenities BE section, Berm moved into Water Management (Plan) /
Earth-Water-Ecology (Observe), and Raised bed moved into Plant Systems
(Plan) / Earth-Water-Ecology (Observe). All three relocated buttons
dispatch their original BE toolIds, so the BE draw pipeline still handles
them — only the rail-section grouping changed.

Final rail counts: Observe = 6 module sections + "Adopt from map" + 7 BE
sections (Buildings / Agricultural / Utilities / Infrastructure /
Machinery / Amenities / Zone markers); Plan = 10 module sections + 7 BE
sections. Right rail mirrors.

Files: `apps/web/src/v3/_shared/builtEnvironmentTools.ts` (+`BE_CATEGORY_GUIDANCE`),
`observe/tools/ObserveTools.tsx`, `plan/PlanTools.tsx`,
`observe/components/ObserveChecklistAside.tsx`, `plan/PlanChecklistAside.tsx`.

`npm run typecheck` clean; `npm test` 710/710 passing (no BE toolId tests
affected).

**ADR.** [2026-05-14 atlas-be-category-flatten](decisions/2026-05-14-atlas-be-category-flatten.md).
