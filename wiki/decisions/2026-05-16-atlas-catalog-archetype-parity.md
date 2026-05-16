# ADR — Intervention catalog: explicit project-type tagging + 6-archetype parity

**Date:** 2026-05-16
**Status:** Accepted
**Context:** OLOS/Atlas MVP-delta, Workstream 4 (catalog depth). Closes
spec Open Question OQ1 ("is the planning DB sufficiently populated for
all project types?").

## Context

The audit answer to OQ1 was *no for catalog depth*. The pre-split
`interventionCatalog.ts` held 22 interventions, homestead-saturated.
Under the non-homestead archetypes' own goal-tree vocabularies almost
nothing was *reachable* by the deterministic sequencing engine:
`regenerative-farm`'s `regen-*` criteria were referenced by zero
interventions; `retreat`, `education`, `conservation`, and
`multi-enterprise` reached only the universal foundations. The
`Intervention` type carried no project-type tag, so "is the DB
populated per type" was unverifiable.

User decisions (locked): **full 6-archetype parity**, an **explicit
`projectTypes` tag**, **6–10 reachable interventions per archetype**,
and a **regression coverage test**.

## Decision

Two orthogonal axes:

- **`projectTypes` tag** — a new optional `Intervention.projectTypes?:
  ProjectArchetype[]`. The engine's eligibility loop skips an
  intervention whose non-empty `projectTypes` does not include the
  active `goalTree.archetype`. Absent **or** empty ⇒ universal (the 22
  legacy entries stay untagged ⇒ zero regression — the first conjunct
  short-circuits and the branch never runs).
- **`criterionContributions`** — reachability. Legacy entries gained
  *additional* cross-vocabulary contributions (shared-tagging by
  reachability, not by the tag) so non-homestead trees can pull them;
  foreign-vocabulary contributions are inert under other trees.

`ProjectArchetype` was extracted as a named exported union (the type
the engine sees at runtime) so a mistyped catalog tag is a compile
error. `PlanProjectTypeKey` (underscored, Record-key only) was
deliberately *not* reused — avoids a third source of truth.

The monolithic `interventionCatalog.ts` was split into
`interventionCatalog/` (`_shared.ts` = 22 verbatim untagged;
`homestead.ts` empty — saturated by shared; one module each for
regenerative-farm, retreat, education, conservation, multi-enterprise;
`index.ts` assembles + exports `getIntervention`).
`interventionCatalog.ts` is now a thin re-export barrel of
`./interventionCatalog/index.js` — zero importer churn (the `.ts` file
shadows the directory in module resolution).

24 new grounded interventions authored (6 each for regen / retreat /
education / conservation / multi-enterprise, tagged with their
hyphenated archetype, all rooting prerequisites on `parcel-assessment`,
each carrying ≥1 real Citation, `maintenanceSchedule`, `zoneAffinity`,
and `geometryTemplate`). Capacity-ceiling criteria use conservative
`contributionFixed` with the derivation written into the Citation note.
Ceiling/reduction criteria (`cons-invasive-pct`) carry an explicit
semantic-inversion comment so a positive contribution is not read as
ecological harm. `multi-largest-enterprise-pct` is intentionally left
without a dedicated contribution (emergent revenue-concentration ratio).

`CATALOG_VERSION` bumped to `goal-compass-v2-2026-05-16` (metadata
only; consumers read the constant — no migration).

## Consequences

- OQ1 closed for all six archetypes: the new
  `archetypeCatalogParity.test.ts` proves the engine selects ≥6
  distinct interventions from each archetype's own goal tree, every
  tagged intervention is grounded, ids are globally unique across the
  split modules, and the four universal foundations stay untagged.
- Non-regressive: `regenerativeFarmCatalog.test.ts` (legacy precedent)
  unchanged and green; full plan-engine suite 102/102 green; `tsc
  --noEmit` clean.
- Forward guardrail: universal foundations / shared prereqs must stay
  untagged (or carry all six) — the parity test's "≥6 *selected*"
  assertion transitively catches a broken prereq chain.
- Future generators add one module + one `index.ts` spread line.

## Covenant

Every authored entry cites a real, correctly attributed published work
(Yeomans, Lowenfels & Lewis, Gabriel, Garrett, Brown, Montgomery,
Gerrish, USDA NRCS, Venolia & Lerner, Coleman, Phillips, Birchard &
Proudman, Bentrup, Barbieri & Mshenga, Orr, Macnamara, Hemenway, SER
Primer, DiTomaso, Pyne et al., Packard & Mutel, Elzinga et al., Salatin,
Dirr & Heuser, Henderson & Van En). No fabricated citations.

## Critical files

- `apps/web/src/v3/plan/data/goalCompassTypes.ts`
- `apps/web/src/v3/plan/data/interventionCatalog/{_shared,homestead,regenerativeFarm,retreat,education,conservation,multiEnterprise,index}.ts`
- `apps/web/src/v3/plan/data/interventionCatalog.ts` (barrel re-export)
- `apps/web/src/v3/plan/engine/goalCompass/sequencingEngine.ts`
- `apps/web/src/v3/plan/engine/goalCompass/__tests__/archetypeCatalogParity.test.ts`
