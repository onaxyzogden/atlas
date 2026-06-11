# 2026-06-11 — Reverse "Informed by" chips on S4/S5 consumer objectives (audit backlog #4)

**Branch:** main. **Scope:** two files — `apps/web/src/v3/plan/objectiveCatalog.ts` + `apps/web/src/v3/plan/strata/ObjectiveDetailPanel.tsx`. **Commit:** `a26d1d12`.

## What happened

Closed audit backlog #4 from the 2026-06-11 stratum traceability audit
([[log/2026-06-11-atlas-stratum-traceability-audit]]). With the universal S2/S3
`feedsInto` wiring from backlog #1 ([[log/2026-06-11-atlas-education-cites-feedsinto-wiring]])
already live, this session added the inverse UI surface: a compact "INFORMED BY"
chip row on the target S4/S5 objectives.

## Implementation

**`objectiveCatalog.ts` — `findUpstreamSourceObjectives(objectiveId)`**

New exported function (23 lines) that inverts the `feedsInto` graph:
1. Iterates `allCatalogueObjectives()` (the global union from `@ogden/shared`)
2. For each objective, checks whether any checklist item has `objectiveId` in its `feedsInto` array
3. Returns the de-duplicated list of source objectives (preserving first-seen order)

Returns an empty array for objectives with no upstream feeds, so the UI renders
nothing for S1-S3, S6-S7, and the bulk of S4-S5 objectives — no regression on
existing panels.

**`ObjectiveDetailPanel.tsx` — "Informed by" section**

- Imports `findUpstreamSourceObjectives` from `../objectiveCatalog.js`
- Computes `upstreamSources` via `useMemo` keyed to `objective.id` (re-keyed per
  objective switch at the parent anyway)
- Renders a section between `ActProgressBar` and `DecisionChecklist` when
  `upstreamSources.length > 0`:
  - Header: "INFORMED BY" in the same uppercase/textTertiary/10px/700-weight style
    as "YOUR DECISIONS"
  - One teal (`C.teal`) chip per unique upstream source objective, showing
    `src.shortTitle ?? src.title`
  - `data-testid="objective-informed-by"` + per-chip `data-testid="informed-by-chip-{id}"`
    for test pinning

Color choice: `C.teal` (distinct from `C.blue` used for forward "feeds" chips on
items, `C.green` for bridge-derived items, `C.amber` for secondary-expanded items).

## Verification

Live DOM probes on the running dev server (`:5200`):

| Objective | Expected chips | Actual chips |
|---|---|---|
| `s4-zones` | 5 (Terrain, Climate, Ecology, Infrastructure, Soil) | 5 ✓ |
| `s4-water-strategy` | 5 (Terrain, Climate, Ecology, Infrastructure, Hydrology) | 5 ✓ |
| `s1-vision` | 0 (section absent) | 0 ✓ |

`s4-water-strategy` chip texts: "Terrain & topography", "Climate & sectors",
"Existing ecology & habitat", "Existing infrastructure & access", "How water moves
across the site" — the `shortTitle` values resolve correctly.

- shared `tsc --noEmit` **clean**
- web `tsc --noEmit` **clean** (exit 0)
- spineTraceability conformance **14/14**, catalogues **107/107** — no regression

Screenshot timed out (known transient `[[project-screenshot-hang]]`); eval probes
are the verification record.

## Amanah

Pure UI addition on a land-design traceability surface. No commercial instrument,
no riba/gharar/advance-sale framing introduced.

## Audit backlog status

All four items now closed:
- #1 universal feedsInto wiring — **closed** (`5f3be4ec`)
- #2 spineTraceability conformance test — **closed** (`874fcbd5`)
- #3 upstream cite items (ag/ev/edu) — **closed** (`5f3be4ec`)
- #4 reverse "Informed by" UI chips — **closed** (`a26d1d12`)
