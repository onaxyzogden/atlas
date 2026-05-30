# Decision Groups (Plan-layer decision scope)

## Summary
A `decision_groups[]` array is an editorial, Plan-layer grouping of an
objective's Act-layer checklist items into a small set of named decision
scopes. Plan shows only the groups (the decisions a steward must make),
never the itemised checklist (which lives in Act). Spec source:
`OLOS_Project_Type_Secondary_Layer_Spec_v1.2` (sections 9.3-9.4) and the
canonical data set `OLOS_Decision_Groups_Reference_v1.0`. **Planned, not yet
encoded** in the codebase as of 2026-05-30 -- see
[decisions/2026-05-30-olos-spec-intake-decision-groups-graduation.md](../decisions/2026-05-30-olos-spec-intake-decision-groups-graduation.md).

## How It Works
Each objective carries one or more decision groups. A group bundles a subset
of that objective's Act-layer checklist `item_ids[]` under a human-authored
`label`, and names the Observe domains it draws on via `observe_feeds[]`.

Field shape (per spec section 9.3):

| Field | Meaning |
|-------|---------|
| `id` | Stable group identifier. |
| `label` | Editorial group name shown in Plan. |
| `item_ids[]` | References to the objective's Act-layer checklist items this group covers. |
| `observe_feeds[]` | Observe domain ids feeding this decision; must match `domain_ids` from the Observe Domain Catalogue v1.0. `-` = none, `Multiple` = several. |
| `source_secondary_id` | `null` for native groups; populated when a secondary type patch-injected the group (renders with amber attribution). |

Authoring rules (per spec section 9.4):
- Every objective MUST have at least one decision group.
- Minimum 1, maximum 6 groups per objective.
- Groups are mutually exclusive: no checklist item appears in two groups.
- `observe_feeds[]` entries must be valid Observe domain ids.
- Patch-injected groups carry `source_secondary_id` and render with amber
  attribution (same provenance treatment as patch-injected objectives).
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
- Not yet implemented in code. Intended consumer: the Plan-stage objective
  surfaces (`apps/web` Plan stratum shell), which would render the group
  labels in place of the raw checklist.
- Spec + data: `OLOS_Project_Type_Secondary_Layer_Spec_v1.2` (9.3-9.4),
  `OLOS_Decision_Groups_Reference_v1.0`.
- Relates to the encoded per-type objective model in
  [entities/shared-package.md](../entities/shared-package.md)
  ("Per-type objective model") -- decision groups would attach to those
  objectives.

## Constraints
- 1-6 groups per objective; mutually exclusive item membership.
- `observe_feeds[]` must reference real Observe Domain Catalogue ids.
- Editorial/authored only -- do not auto-generate.
- Patch-injected groups must carry `source_secondary_id` and amber-attribute.
- Ref-scheme note: the Decision Groups Reference uses type-prefix refs
  (`XX.S{stratum}.{n}`, e.g. `RF.S1.1`, `RS.S2.1`). The encoded catalogues
  use a different scheme (`SILV-S1.4`, `ORCH-S1.4`, `U-S...`, etc.). This is
  a known doc-vs-code delta recorded in the intake ADR; the encoded scheme
  remains canonical for the codebase.
