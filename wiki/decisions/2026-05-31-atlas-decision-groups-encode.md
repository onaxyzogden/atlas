# ADR: Encode decisionGroups[] on the Plan-stage objective model

**Date:** 2026-05-31
**Status:** accepted
**Supersedes (status flip):** the planned-not-encoded posture of
[2026-05-30-olos-spec-intake-decision-groups-graduation.md](2026-05-30-olos-spec-intake-decision-groups-graduation.md)
(delta #4 "decision_groups[] is a new, unencoded schema field" is now closed).

**Context:**
The OLOS intake ADR (2026-05-30) documented `decision_groups[]` (Secondary
Layer Spec v1.2 sections 9.3-9.4; canonical data in
`OLOS_Decision_Groups_Reference_v1.0`) as authoritative forward design but
encoded nothing. This session implemented the full slice: schema + resolver
wiring + Plan render + real data across all encoded catalogues + tests.

A Decision Group is a Plan-layer editorial grouping of an objective's
Act-layer checklist items into 1-6 named decision scopes. Plan surfaces the
groups (the decisions a steward must make); the itemised checklist remains
the Act-layer detail.

Three findings from the reference doc shaped the encoding (recorded in the
intake ADR's delta list and re-confirmed here):
1. The doc supplies group **labels, counts, and observe-feed labels** per
   objective but **not** explicit `item_ids` -- only per-group item counts.
2. The doc's counts are "16-universal" era and do not match the encoded
   "19-universal" checklists (systemic ~+1 item per objective drift).
3. The doc's observe-feeds are 14 display labels plus sentinels `Multiple`
   (most common) and `-` (none); none map cleanly to the 16 `UniversalDomain`
   kebab ids, and `Multiple` is unmappable.

**Decision (operator rulings, 2026-05-31):**

- **R1 -- Author `item_ids` (informed override of "don't invent content").**
  Partition each encoded objective's full checklist into the doc's groups: a
  full mutually-exclusive partition where every checklist item lands in exactly
  one group. Where a doc row exists, group **labels/counts/feeds are
  source-verbatim**; **item membership is authored-by-Claude** under this
  override and documented inline (per-catalogue header note). Same pattern as
  the AG-S6.4 5th-item and Wellness-secondary precedents.

- **R2 -- `observeFeeds` as verbatim string labels.** Schema type
  `observeFeeds: string[]`; transcribe the doc's labels exactly (`Multiple`
  literal, `-` -> `[]`, compound feed -> two entries). Display-only (feed chips
  in Plan); NOT wired to divergence/revision routing. No lossy id mapping.

- **Extended override (2026-05-31).** For objectives the reference doc does not
  enumerate at the encoded checklist granularity, author the **full group
  taxonomy** (labels, membership, feeds) editorially under the same provenance
  discipline.

- **"Author meaningful labels" refinement.** For placeholder/divergent doc
  rows, keep the doc's group/item **count** as guidance but author meaningful
  labels + feeds, documented as authored under the extended override.

**Implementation:**
- **Schema** (`schemas/plan/planStratumObjective.schema.ts`):
  `DecisionGroupSchema` ({ id, label, itemIds[>=1], observeFeeds[]=default,
  sourceSecondaryId=nullable }); `decisionGroups[]=default([])` on
  `PlanStratumObjectiveSchema`; `injectedGroups[]=default([])` on
  `PatchRecordSchema` (commit `6d4ffd93`).
- **Resolver** (`relationships/resolveProjectObjectives.ts`): deep-clones
  `decisionGroups`; patch-apply loop stamps `sourceSecondaryId =
  p.secondaryTypeId` on `injectedGroups`, mirroring the `injectedItems`
  `expandedBySecondaryId` provenance path (commit `6d4ffd93`).
- **Authoring helper** (`catalogues/authoring.ts`): `dg(id, label, itemIds,
  observeFeeds=[])` -> group literal with `sourceSecondaryId: null`; `obj()`
  takes `decisionGroups?`; `patch()` takes `injectedGroups?`.
- **Data (Phase 3a, commit `d69e244c`):** universal.ts + regenFarm.ts +
  residential.ts (the verified 38-objective resolved pair; residential patches
  carry `injectedGroups`, rubric `<targetObjId>-dgres<n>`).
- **Data (Phase 3b fan-out):** agritourism (`faf49f3a`), wellness (`c7325f1b`),
  silvopasture (`c1ebd5e0`, patch rubric `-dgsilv1`), orchard (`d1f591bf`,
  patch rubric `-dgorch1`), nursery (`7d844fc7`, no patches), ecovillage
  (`2fb524cb`, primary-only, no patches). Every encoded primary + secondary +
  patch now carries decision groups.
- **Plan render (Phase 4, commit `e74c7171`):** `DecisionChecklist.tsx`
  renders group sub-headers (label + "N items" + verbatim feed chips) with
  checkboxes nested beneath when `decisionGroups.length > 0`; flat-list
  fallback otherwise; amber "Added by <Type>" on secondary-sourced groups.
- **Tests (Phase 5):** catalogues partition invariant (1-6 groups, >=1 item
  each, real itemIds, no item in two groups, full partition, globally-unique
  ids, base groups sourceSecondaryId=null, shared catalogue not mutated);
  resolver stamps sourceSecondaryId on injected groups; DecisionChecklist
  render/bucketing/amber/fallback. Green at close: catalogues 75/75, resolver
  32/32, tsc clean.

**Disclosed divergence from spec intent:** the spec's "Plan shows only groups,
never items" is only partially met -- item checkboxes remain nested under each
group because the stratum-progress completion model
(`planStratumProgressStore`) is keyed on item ids. A groups-only display with
group-level completion is a deliberate later refinement, not this slice.

**Consequences:**
- `decision_groups[]` is now encoded end-to-end; intake-ADR delta #4 is closed.
  The other three deltas (16-vs-19 universal, ref-scheme, tension count) stand
  as the encoded model remains canonical.
- Group ids follow `<objId>-dg<n>` for authored base groups; patch-injected
  groups use per-type unique rubrics (`-dgres<n>`/`-dgsilv1`/`-dgorch1`) to
  keep ids globally unique in any resolved set.
- `observeFeeds` is a free-string display field by design; the partition test
  asserts only that present entries are non-empty strings (no vocabulary
  enforcement). A future slice could wire feeds to Observe-domain routing.
- Covenant: operational surface only; no economic content. The two ecovillage
  financial objectives (EV-S4.8, EV-S7.5) are communal member-contribution
  framing, encoded verbatim per the prior 2026-05-29 authorisation; their
  decision groups are organisational, not a sale of future yield. CSRA
  prohibition ([[fiqh-csra-erased-2026-05-04]]) untouched. ASCII-only copy.
