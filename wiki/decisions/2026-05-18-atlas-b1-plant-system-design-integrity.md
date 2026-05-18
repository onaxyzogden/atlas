# 2026-05-18 — B1: Plant-system design integrity (first Sub-project B slice)

**Status:** Implemented — verified (tsc clean for B1, shared tsc exit 0,
13/13 vitest green). NOT yet committed (out-of-band working-tree state —
see "Commit posture" below).

**Context source:** The B1–B5 decomposition ADR
[[2026-05-18-atlas-bd-subproject-decomposition]] (committed `f8de57de`).
B1 is the first B slice; B4/B5 assume valid guilds, so B1 leads.

## Decision

B1 was built as the ADR scoped it — a companion-planting constraint
checker + a Year0→Year30 succession-path designer — additive front-end,
non-covenant (no riba/gharar), inside the already-registered
`plant-systems` plan module. Three build-time refinements of the ADR's
generic "B adds criteria" line, all per-part calls the ADR explicitly
deferred:

1. **Two separate cards**, not one. The plant-systems module is strictly
   one-card-per-concern; an audit and an editable designer are different
   interaction models.
2. **Succession path is a net-new persisted editable model** in its own
   additive Zustand persist slice (`ogden-succession-path`, `version:1`,
   no `temporal`, no `migrate`) — zero risk to the `ogden-polyculture`
   v3 slice. The existing read-only `CanopySuccessionCard` simulator is
   untouched and remains the projection.
3. **Pure design-time validator, NO goal-tree criterion** — mirrors the
   in-codebase `EdgeConnectivityCard` / `TemporalCoherenceCard`
   precedent. B1 has no observation stream to score, so it is not added
   to `goalTreeTemplates.ts` and never blocks a guild save.

## What was built

- `cards/plant-systems/guildIntegrityMath.ts` — pure, deterministic. The
  speciesId→crop-name bridge (`resolveCompanion`) routes through the
  exported `findCompanions()` to inherit its private `normalize()`
  rather than fork it. Three checks: antagonism/allelopathy (companion
  MATRIX + **mandatory** `plantCatalog.incompatible` fallback for
  perennials the annual-crop matrix omits, e.g. black_walnut→juglone;
  explicit `unmatched` **info** finding when a pair can't be verified —
  never a false all-clear), per-layer spacing **heuristic** (documented;
  no real per-member geometry exists), maturity-sync `daysToMaturity`
  spread.
- `cards/plant-systems/GuildIntegrityCard.tsx` — read-only audit surface
  (severity rollup + per-guild findings). No store writes, no save gate.
- `store/successionPathStore.ts` — the additive persist slice.
- `cards/plant-systems/SuccessionPathCard.tsx` — "Seed from guilds"
  (Year-0 plant + thin at `round(days/365)` clamped 0–30); editable
  rows auto-persist; inline non-blocking warnings.
- Registration: 2 append-only edits only (`types.ts` MODULE_CARDS +
  `PlanModuleSlideUp.tsx` lazy import/switch). `plant-systems` was
  already a registered module → no `PlanModule` union member added, so
  every `Record<PlanModule,_>` map and the `never`-guarded switch stay
  inert (confirmed by tsc, not edited).

## Verification

- `tsc -p apps/web` — clean for all eight B1 files. Remaining project
  tsc errors (`useFlowEndpointOptions`, `workItemStore.migration`,
  `workItemStore`) are **pre-existing, out-of-band D0 work**, not B1.
- `tsc -p packages/shared` — exit 0 (shared untouched; no transitive
  break).
- vitest — `guildIntegrityMath` 8/8, `successionPathStore` 5/5
  (catalog-incompatible black_walnut+apple error path, unmatched info
  path, spacing over-budget, maturity spread, empty guild → `[]`,
  per-project isolation, upsert/remove idempotency).
- Vite dev server shows no transform/HMR error from any B1 file. The
  cards are plain React; per the screenshot-honesty rule no browser
  screenshot is claimed — they sit deep behind plant-systems module
  nav requiring a project with guilds, and the unrelated out-of-band
  `workItemStore.migration` import error currently blocks the app
  shell anyway.

## Commit posture

The working tree is mixed: the 8 B1 files alongside active, uncommitted
out-of-band D0 work (`workItemStore*`, `workItemStore.migration*`,
`packages/shared/src/schemas/workItem.schema.ts`, several `*LogStore`
edits, `syncManifest.ts`, `packages/shared/src/index.ts`) and the
`docs/ux-walkthrough-regen-farm-run5` doc. Per CLAUDE.md (do not clobber
others' uncommitted work; flag), B1 is staged by **explicit path only**
(the 8 files) and the commit/push decision is surfaced to the operator
rather than blanket-committing a mixed tree.

## Consequences

- B1 exists and is verified; B2–B5 may now build on valid-guild
  assumptions (B4/B5 depend on B1).
- No DB migration, no API endpoint, no schema/goal-tree/`Record<
  PlanModule,_>` change — A-series additive covenant held.
- The out-of-band D0 work is independent and untouched; B1 does not
  resolve or entangle with it.

## References

- [[2026-05-18-atlas-bd-subproject-decomposition]] — B1–B5 decomposition
  (the scope this implements).
- [[2026-05-17-atlas-regeneration-monitoring-a1]] — additive-first
  covenant origin; pure-module + card + colocated-tests precedent.
- `EdgeConnectivityCard` / `TemporalCoherenceCard` — design-validator
  (no goal-tree criterion) precedent B1 follows.
