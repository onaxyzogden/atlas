# Decision Groups (Plan-layer decision scope)

## Summary
A `decision_groups[]` array is an editorial, Plan-layer grouping of an
objective's Act-layer checklist items into a small set of named decision
scopes. Plan shows only the groups (the decisions a steward must make),
never the itemised checklist (which lives in Act). Spec source:
`OLOS_Project_Type_Secondary_Layer_Spec_v1.2` (sections 9.3-9.4) and the
canonical data set `OLOS_Decision_Groups_Reference_v1.0`. **Encoded
end-to-end as of 2026-05-31** (schema + resolver + Plan render + data across
all encoded catalogues + tests) -- see
[decisions/2026-05-31-atlas-decision-groups-encode.md](../decisions/2026-05-31-atlas-decision-groups-encode.md).
The earlier planned-not-encoded posture
([decisions/2026-05-30-olos-spec-intake-decision-groups-graduation.md](../decisions/2026-05-30-olos-spec-intake-decision-groups-graduation.md))
is superseded.

## How It Works
Each objective carries one or more decision groups. A group bundles a subset
of that objective's Act-layer checklist `item_ids[]` under a human-authored
`label`, and names the Observe domains it draws on via `observe_feeds[]`.

Encoded field shape (`DecisionGroupSchema`, camelCase in code; spec 9.3 uses
snake_case):

| Field (code) | Meaning |
|-------|---------|
| `id` | Stable group identifier. `<objId>-dg<n>` for authored base groups; patch-injected groups use per-type unique rubrics (`-dgres<n>`, `-dgsilv1`, `-dgorch1`). Globally unique in any resolved set. |
| `label` | Editorial group name shown in Plan. |
| `itemIds[]` | References to the objective's Act-layer checklist items this group covers (>=1). **Authored under R1** -- a full mutually-exclusive partition of the checklist. |
| `observeFeeds[]` | **R2: verbatim display-label strings**, transcribed from the doc (`Multiple` kept literal, `-` -> `[]`, compound feed -> two entries). Display-only feed chips; NOT validated against Observe domain ids and NOT wired to routing. Defaults to `[]`. |
| `sourceSecondaryId` | `null` for native/base groups; stamped by the resolver to `p.secondaryTypeId` when a secondary patch-injected the group via `injectedGroups` (renders with amber attribution). |

Authoring rules (spec 9.4 + the 2026-05-31 encode rulings):
- Every grouped objective has at least one decision group (1-6).
- Groups are mutually exclusive AND exhaustive: every checklist item lands in
  exactly one group (full partition -- enforced by the catalogues test).
- `itemIds` membership is authored-by-Claude (R1); where a doc row exists,
  labels/counts/feeds are source-verbatim. Where the doc does not enumerate
  groups at the encoded checklist granularity, the full taxonomy is authored
  editorially (extended override / "author meaningful labels").
- `observeFeeds` are free strings (R2); no vocabulary enforcement.
- Patch-injected groups carry `sourceSecondaryId` (resolver-stamped, never
  authored inline) and render with amber attribution.
- Groups are editorial / authored, never auto-generated from the checklist.
- If an objective would need more than 6 groups, review it for graduation
  per Authoring Standards Principle 3 (the objective is doing too much).

The canonical data lives in `OLOS_Decision_Groups_Reference_v1.0`, which
tabulates groups for all 18 catalogues. Each row reads:
`Ref / Objective title / Src (NAT native | SEC secondary-sourced) /
Grps (count) / numbered groups "N. Label (X items) -> ObserveFeed"`.
Part 1 covers primary catalogues; Part 2 covers the six Secondary Type
Catalogues (Residential RS, Off-Grid OGS, Homestead HMS, Ecovillage EVS,
Conservation Zone COS, Nursery-secondary NRS).

## Where It's Used
- **Schema:** `packages/shared/src/schemas/plan/planStratumObjective.schema.ts`
  (`DecisionGroupSchema`; `decisionGroups[]` on the objective; `injectedGroups[]`
  on `PatchRecordSchema`).
- **Resolver:** `packages/shared/src/relationships/resolveProjectObjectives.ts`
  deep-clones groups and stamps `sourceSecondaryId` on patch-injected groups.
- **Authoring helper:** `catalogues/authoring.ts` `dg(...)`; data encoded across
  universal.ts, regenFarm.ts, residential.ts, agritourism.ts, wellness.ts,
  silvopasture.ts, orchard.ts, nursery.ts, ecovillage.ts.
- **Plan render:** `apps/web/src/v3/plan/strata/DecisionChecklist.tsx` renders
  group sub-headers (label + "N items" + feed chips) with checkboxes nested
  beneath; flat-list fallback when no groups; amber "Added by <Type>" on
  secondary-sourced groups.
- Spec + data source: `OLOS_Project_Type_Secondary_Layer_Spec_v1.2` (9.3-9.4),
  `OLOS_Decision_Groups_Reference_v1.0`.
- Relates to the encoded per-type objective model in
  [entities/shared-package.md](../entities/shared-package.md)
  ("Per-type objective model") -- decision groups attach to those objectives.

## Constraints
- 1-6 groups per grouped objective; full mutually-exclusive partition of the
  checklist (every item in exactly one group).
- `observeFeeds[]` are verbatim display strings (R2) -- NOT validated against
  Observe Domain Catalogue ids; display-only, not wired to routing.
- Editorial/authored only -- do not auto-generate. Item membership authored
  under R1 / the extended override.
- Patch-injected groups carry resolver-stamped `sourceSecondaryId` and
  amber-attribute.
- **Spec-intent divergence (disclosed):** Plan keeps per-item checkboxes nested
  under each group (not groups-only) because `planStratumProgressStore` is keyed
  on item ids. Groups-only display with group-level completion is a later
  refinement.
- Ref-scheme note: the Decision Groups Reference uses type-prefix refs
  (`XX.S{stratum}.{n}`, e.g. `RF.S1.1`, `RS.S2.1`). The encoded catalogues
  use a different scheme (`SILV-S1.4`, `ORCH-S1.4`, `U-S...`, etc.). This is
  a known doc-vs-code delta recorded in the intake ADR; the encoded scheme
  remains canonical for the codebase. Group ids likewise follow the
  `<objId>-dg<n>` code scheme, not the doc's numbering.
