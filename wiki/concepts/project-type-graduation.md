# Project Type Graduation

## Summary
Graduation is the model by which a land project grows into additional project
types over time rather than switching types. Core principle: "Land projects
don't switch types -- they grow into them." An append-only `type_history[]`
records every type event; `active_primary_types[]` is derived from it. Spec
source: `OLOS_Project_Type_Graduation_Spec_v1.0`. **Planned, not yet encoded**
in the codebase as of 2026-05-30 -- see
[decisions/2026-05-30-olos-spec-intake-decision-groups-graduation.md](../decisions/2026-05-30-olos-spec-intake-decision-groups-graduation.md).

## How It Works
A project keeps an append-only `type_history[]`. Entries are never undone or
deleted; the project's current shape is computed from the full history.

`event_type` enum:
- `initial_selection` -- the first type chosen at project creation.
- `primary_addition` -- a new primary layer added (the "graduation" core case).
- `primary_swap` -- a true change of primary (rare; "use with caution").
- `secondary_addition` -- a secondary type added.
- `secondary_removal` -- a secondary type removed.

`active_primary_types[]` is **derived/computed** from `type_history[]` and may
hold multiple active primaries simultaneously (3+ is valid but uncommon).

Three scenarios:
1. Add a secondary -- covered by the Plan Nav Spec (not re-specified here).
2. Add a primary layer -- "graduation", the core case of this spec.
3. True primary swap -- rare; flagged "use with caution".

De-duplication on graduation (two-step match key):
- Step 1: match by `objective_id` exact.
- Step 2 (fallback): `canonical_key` = stratum + `domain_id` +
  normalised_title (lowercased, punctuation-stripped, whitespace-collapsed).

Invariants:
- Stratum progression never regresses -- completed strata stay complete.
- Observe data continuity -- `source_objective_id` + `source_type` are
  immutable; Observe data is never re-attributed or deleted on graduation.
- Graduation is deliberate: steward-initiated only, never automatic.

Primary+primary tension register: tensions P1-P5 capture the design
frictions when two primary types are active at once.

UX surface (per spec): a graduation banner; a "New" badge for 14 days on
freshly added objectives; source tags "Primary . [Type]"; and an
"Also in [Type]" tag for dedup attribution where an objective belongs to
more than one active type.

## Where It's Used
- Not yet implemented in code. Intended consumers: a future graduation
  engine + store, plus the Plan/Act surfaces that would render the
  graduation banner, "New" badges, and source tags.
- Relates to the encoded per-type objective model in
  [entities/shared-package.md](../entities/shared-package.md) -- graduation
  would re-resolve a project's objective set as primaries are added.
- The mid-project add/remove path (deferred Sub-slice F of the per-type
  model work) is the implementation seam graduation would build on.

## Constraints
- `type_history[]` is append-only -- never rewrite or delete entries.
- `active_primary_types[]` is derived, never stored as the source of truth.
- Completed strata never regress.
- Observe `source_objective_id` / `source_type` are immutable post-graduation.
- Graduation is steward-only and deliberate; never auto-triggered.
- Tension register P1-P5 governs primary+primary combinations.
