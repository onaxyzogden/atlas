# ADR: Needs & Yields dependency graph

**Date:** 2026-04-28
**Status:** proposed
**Scope:** `packages/shared/src/demand/`, new `packages/shared/src/relationships/`, `apps/web/src/features/map/`, scoring engine

## Context

The 2026-04-28 [Permaculture Alignment](../concepts/permaculture-alignment.md)
review (Permaculture Scholar conversation
`48a34396-5525-4a57-9884-108d93b1872f`) flagged two of Holmgren's twelve
principles as **fully missing** from Atlas:

- **Principle 6 — Produce No Waste**: Atlas inventories inputs (demand) and
  outputs (yields/finances), but doesn't model output→input cycling between
  elements (chicken-coop manure → orchard fertility, greywater → swale,
  kitchen scraps → compost → market garden).
- **Principle 8 — Integrate rather than segregate** (currently *Partial*):
  users can co-place entities on the canvas, but the data model doesn't
  represent the **functional interconnections** that make a permaculture
  system more than the sum of its elements.

The Scholar's source basis: *Building Community*, *Permaculture Decision
Making Matrix*, *The Permaculture Principles*, *The Foundations of
Permaculture Design*. The principle is that "a permaculture system's
strength is defined by the web of connections between its elements, where
waste must become food and nutrients must be cycled rather than mined."

This is the highest-leverage P0 because it changes Atlas from a *placement
tool* into a *relationship modelling tool* — which is what permaculture
*is*. Without it, no amount of additional data layers will make Atlas
recognisable as a permaculture instrument.

## Decision

Add a first-class **Relationships** layer to the Atlas data model:
every placed entity declares its **outputs** and **inputs**, and the canvas
requires (or strongly nudges) that every output be routed to another
element's input before the design is considered complete.

### Module layout

```
packages/shared/src/relationships/
  catalog.ts          # OUTPUTS_BY_TYPE, INPUTS_BY_TYPE for every entity type
  flow.ts             # Edge<{ fromId, fromOutput, toId, toInput, ratio }>
  cycle.ts            # graph algorithms: orphan outputs, unmet inputs, leaks
  index.ts            # barrel
```

Mirrors the `@ogden/shared/demand` subpath pattern from the
[2026-04-27 Demand Coefficient Tables ADR](2026-04-27-demand-coefficient-tables.md).

### Catalog seed (v1)

Per-entity-type table of `{ outputs: ResourceType[], inputs: ResourceType[] }`,
where `ResourceType` is a closed enum (initial set: `manure`, `greywater`,
`compost`, `biomass`, `seed`, `forage`, `mulch`, `heat`, `shade`, `pollination`,
`pest_predation`, `nutrient_uptake`, `surface_water`).

Example entries:
- **Chicken coop** → outputs `[manure, pest_predation, eggs]`; inputs
  `[forage, kitchen_scraps, water]`.
- **Orchard** → outputs `[fruit, pollination_demand, leaf_litter]`; inputs
  `[manure, mulch, water, pollination]`.
- **Swale** → outputs `[soil_moisture, mulch_capture]`; inputs
  `[surface_water]`.

### Engine wiring

Scoring engine adds a new dimension: `integrationScore`. Computed as the
ratio of **routed** outputs to **total** outputs across all placed entities,
weighted by component count. A site with every output routed scores 1.0; a
site with N orphan outputs is penalised proportionally.

`integrationScore` participates in the existing 8-dimension weighted rollup
under a new "Ecological Integration" axis (weight TBD in implementation;
suggest 0.10 to start, tunable per-project).

### Canvas surface

- **Output sockets** appear on each placed entity icon when "relationships"
  view is toggled (initially behind a feature flag).
- **Input sockets** glow when a compatible output is being dragged.
- **Edges** rendered as arrows between sockets; can be auto-suggested by
  proximity + type compatibility, then user-confirmed.
- **Orphan-output flag** in the right rail lists every unrouted output with
  a "suggest target" button.

### Acceptance criterion

The user cannot mark a zone design as "complete" (status flips from `draft`
to `ready-for-review`) until every biological or structural element with
non-empty `outputs` in the catalog has at least one output explicitly linked
to another element's input. Override allowed via per-project
`allowOrphanOutputs: true` flag (escape hatch for users who genuinely don't
want this discipline) — flag is surfaced prominently in the project header
when set, so it's a deliberate choice, not a default.

## Alternatives considered

- **Implicit graph from proximity** — infer relationships from spatial
  adjacency without explicit user wiring. **Rejected**: defeats the
  pedagogical value. Permaculture's design discipline is that the *designer*
  thinks through the relationship; the software shouldn't paper over that.
- **Free-text relationship notes** — let users describe connections in
  prose. **Rejected**: doesn't compose with the scoring engine and can't be
  validated.
- **Defer to v2** — make relationships a documentation-only concept first.
  **Rejected**: then it's not a feature, it's a wiki page. The whole point
  is to bake the discipline into the canvas.

## Consequences

- **New shared subpath** `@ogden/shared/relationships` — follows the demand
  module precedent.
- **New scoring dimension** `integrationScore` — bumps the canonical 8
  dimensions to 9. The [Scoring Engine](../concepts/scoring-engine.md) page
  must be updated.
- **Feature manifest** gets a new section for "Relationship Catalog" with
  phase-gating; initial implementation behind a flag.
- **Backwards compatibility**: existing projects load with empty
  `relationships: []` arrays and `integrationScore = null`. The 8-dim total
  remains the source of truth until a project opts in or until v2.
- **Data migration**: catalog seed lives in code, not DB. No migration
  required for the catalog itself; project-stored `Edge[]` arrays go in
  `project_designs.relationships` jsonb column (new) — single migration.

## Verification

- Catalog catalog test: every entity type in the manifest has a row in
  `OUTPUTS_BY_TYPE` and `INPUTS_BY_TYPE`. Fail CI if a new type is added
  without catalog entries.
- Cycle test fixtures: hand-built 3-element loops (chicken → orchard → 
  composter → chicken) validate that `cycle.ts` recognises closed loops
  and assigns a perfect `integrationScore`.
- E2E: place chicken coop + orchard, assert `integrationScore = 0` (orphan
  manure); draw an edge manure→orchard.input.fertility, assert score → 0.5;
  draw edge orchard.leaf_litter→compost.input, assert score → 1.0.
- Wiki update: scoring engine page documents the new dimension.

## Source citations

- *Building Community* — "the land and providing for oneself while enhancing
  natural systems has intrinsic value regardless [of yields]" — establishes
  that interconnection is the *point*, not an optimisation.
- *The Permaculture Principles* — Principle 6 ("Produce No Waste"),
  Principle 8 ("Integrate rather than segregate").
- *The Foundations of Permaculture Design* — "the design becomes an
  interconnection of systems."
