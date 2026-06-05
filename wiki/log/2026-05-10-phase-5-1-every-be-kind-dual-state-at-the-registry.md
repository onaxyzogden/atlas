# 2026-05-10 — Phase 5.1: every BE kind dual-state at the registry


`packages/shared/src/builtEnvironmentKinds.ts` — relaxed
`defaultStates` from `['proposed']` to `['existing', 'proposed']` for
the 8 holdouts: cabin, yurt, tent-glamping, pavilion, classroom,
bathhouse, earthship, lookout. Registry now reports 31/31 kinds as
dual-state, satisfying the ADR premise "every kind valid in both
states." Stewards inventorying brownfield sites can now annotate an
existing cabin or earthship without the schema-level affordance hint
saying "proposed-only."

The schema already accepted both states for all kinds (this only
gates default UI affordances), so no migration or store change is
needed. tsc clean, V2 store + adapter vitest 32/32 green.

Phases 5.2–5.4 (Observe draw rail surfacing the new kinds, Plan
structure-type taxonomy mirror, dashboard derivations widening from
8 to 31 cards) remain as substantial follow-ups — they touch the UI
surface rather than the data layer and are best tackled in their own
session.

Closes Phase 5.1 of ADR
`2026-05-10-atlas-built-environment-unification.md`.
