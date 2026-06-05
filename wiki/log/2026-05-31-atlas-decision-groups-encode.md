# 2026-05-31 -- decisionGroups[] encoded end-to-end (schema + resolver + Plan render + all catalogues + tests)

**Branch:** `feat/atlas-permaculture` (rebased out-of-band; each slice committed
the moment it verified, ahead-only, not pushed).
**Commits (slice spine):** `6d4ffd93` schema + resolver -> `d69e244c` Phase 3a
data (universal + regenFarm + residential) -> `e74c7171` Plan render -> Phase 3b
fan-out `faf49f3a` agritourism, `c7325f1b` wellness, `c1ebd5e0` silvopasture,
`d1f591bf` orchard, `7d844fc7` nursery, `2fb524cb` ecovillage. Tests landed with
the data/render commits. All by explicit path; foreign WIP left untouched.
**Files:** `packages/shared/src/schemas/plan/planStratumObjective.schema.ts`,
`.../relationships/resolveProjectObjectives.ts`,
`.../constants/plan/catalogues/authoring.ts` + universal/regenFarm/residential/
agritourism/wellness/silvopasture/orchard/nursery/ecovillage `.ts`,
`.../__tests__/catalogues.test.ts`, `.../relationships/__tests__/resolveProjectObjectives.test.ts`,
`apps/web/src/v3/plan/strata/DecisionChecklist.tsx` (+ `.module.css`) +
`__tests__/DecisionChecklist.test.tsx`.

## What shipped

The full graduation of `decision_groups[]` from planned-not-encoded
([[log/2026-05-30-olos-spec-intake-decision-groups-graduation]]) to encoded
end-to-end. A Decision Group is a Plan-layer editorial grouping of an
objective's Act-layer checklist items into 1-6 named decision scopes
([[concepts/decision-groups]]).

- **Schema:** `DecisionGroupSchema` ({ id, label, itemIds[>=1], observeFeeds[]
  default, sourceSecondaryId nullable }); `decisionGroups[]` defaulted on the
  objective; `injectedGroups[]` defaulted on `PatchRecordSchema`. Additive
  defaults -> existing objectives + static skeleton validate unchanged.
- **Resolver:** deep-clones `decisionGroups`; patch-apply loop stamps
  `sourceSecondaryId = p.secondaryTypeId` on injected groups, an exact mirror
  of the `injectedItems`/`expandedBySecondaryId` provenance path.
- **Authoring helper:** `dg(id, label, itemIds, observeFeeds=[])` joins
  `ck`/`obj`/`patch`; `obj()`/`patch()` extended with `decisionGroups?`/
  `injectedGroups?`.
- **Data:** every encoded catalogue now carries full mutually-exclusive group
  partitions. Phase 3a = universal + regenFarm + residential (residential
  patches inject groups, rubric `-dgres<n>`). Phase 3b fan-out = agritourism,
  wellness, silvopasture (patch rubric `-dgsilv1`), orchard (`-dgorch1`),
  nursery (8 secondary objectives, no patches), ecovillage (31 primary, no
  patches). Group ids `<objId>-dg<n>`, globally unique.
- **Plan render:** `DecisionChecklist.tsx` groups the checklist under
  sub-headers (label + "N items" + verbatim feed chips) with per-item
  checkboxes nested beneath; flat-list fallback when no groups; amber "Added
  by <Type>" on secondary-sourced groups via `findProjectType`.

## Operator rulings (2026-05-31)

- **R1** -- author `item_ids` (informed override of "don't invent content"):
  full mutually-exclusive partition of each checklist; where a doc row exists,
  labels/counts/feeds source-verbatim, item membership authored-by-Claude.
- **R2** -- `observeFeeds` as verbatim display strings (no Observe-domain-id
  validation, not wired to routing).
- **Extended override** -- author the full group taxonomy for objectives the
  doc does not enumerate at the encoded checklist granularity.
- **"Author meaningful labels"** -- for placeholder/divergent doc rows, keep
  the doc's group/item count as guidance, author meaningful labels + feeds.

Documented inline (per-catalogue header notes) + in the ADR
[[decisions/2026-05-31-atlas-decision-groups-encode]]. Closes intake-ADR
delta #4; the other three deltas (16-vs-19 universal, ref-scheme, tension
count) stand with code canonical.

## Disclosed divergence

The spec's "Plan shows only groups, never items" is only partially met --
per-item checkboxes remain nested under each group because
`planStratumProgressStore` is keyed on item ids. A groups-only display with
group-level completion is a deliberate later refinement, not this slice.

## Covenant

Operational surface only; no economic content. The two ecovillage financial
objectives (EV-S4.8, EV-S7.5) carry communal member-contribution framing,
encoded verbatim per the prior 2026-05-29 authorisation; their decision groups
are organisational, not a sale of future yield. CSRA prohibition
([[fiqh-csra-erased-2026-05-04]]) untouched. ASCII-only copy.

## Verification

Shared `tsc --noEmit` EXIT 0 at every catalogue gate. `vitest run catalogues
resolveProjectObjectives` green: catalogues 75/75 (partition invariant: 1-6
groups, >=1 item each, real itemIds, no item in two groups, full partition,
globally-unique ids, base groups sourceSecondaryId=null, shared catalogue not
mutated), resolver 32/32 (sourceSecondaryId stamped on injected groups). The
DecisionChecklist happy-dom tests cover grouped render, item bucketing, feed
chips, amber attribution, and flat fallback. Divergence-checked (`git fetch` +
`git status -sb` ahead-only) before each commit; not pushed (awaiting operator
go).

## State after

**Decision groups COMPLETE across the encoded model.** All encoded primaries
(Regenerative-Farm, Agritourism, Wellness, Silvopasture, Orchard, Ecovillage)
+ secondaries (Residential, Wellness, Nursery) + the Universal-19 carry decision
groups. Unencoded/universal-only types (Conservation, Education, MarketGarden,
OffGrid, Homestead stand-in) gain groups when their catalogues are encoded.
Pending: optional groups-only Plan display + Observe-feed routing wiring;
push awaits operator go.
