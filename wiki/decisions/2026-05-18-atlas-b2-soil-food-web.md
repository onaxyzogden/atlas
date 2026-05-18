# 2026-05-18 — B2: Soil food-web layer (second Sub-project B slice)

**Status:** Implemented — verified and committed (apps/web tsc clean for
all B2 files, shared tsc exit 0, 15/15 vitest green). Committed to
`feat/atlas-permaculture` as `d6af134a..ba3b5b7c`; final code review
APPROVED. NOT yet pushed — see "Commit posture".

**Context source:** The B1–B5 decomposition ADR
[[2026-05-18-atlas-bd-subproject-decomposition]] and B1
[[2026-05-18-atlas-b1-plant-system-design-integrity]]. B2 is the second
B slice and assumes valid guilds (B1, built).

## Decision

B2 was built as the ADR scoped it — root-exudate / mycorrhizal profile
mapping per species feeding a soil-biology design view + compost /
vermicompost / compost-tea cycle planning — additive front-end,
non-covenant (no riba/gharar), inside the already-registered
`soil-fertility` plan module. Build-time refinements (per-part calls
the ADR deferred), all mirroring the proven B1 template:

1. **Two separate cards**, not one — a read-only soil food-web audit
   and an editable compost-cycle designer are different interaction
   models (one-card-per-concern).
2. **B2-owned static lookup, not a plant-catalog extension** —
   `soilBiologyProfiles.ts` owns per-species mycorrhiza/exudate the way
   B1's checker owns the companion bridge; the catalog is untouched.
3. **Compost cycle is a net-new persisted editable model** in its own
   additive Zustand persist slice (`ogden-compost-cycle`, `version:1`,
   no `temporal`, no `migrate`) — zero risk to `ogden-polyculture`.
4. **Pure design-time audit, NO goal-tree criterion** — B1 precedent;
   no observation stream to score, never blocks a save.

## What was built

- `cards/soil-fertility/soilBiologyProfiles.ts` — static B2-owned
  speciesId→{mycorrhiza, exudateClass, note?} table (~20 species,
  family-generalised from mycorrhizal literature; design heuristic).
- `cards/soil-fertility/soilFoodWebMath.ts` (+ colocated tests, 10) —
  pure, deterministic. `resolveProfile` two-tier (direct speciesId key
  then normalized snake_case commonName). Three checks: explicit
  `unmatched` **info** when a member can't be profiled (never a false
  all-clear), mycorrhiza-coherence vs anchor (skips `none` + anchor
  self; unprofiled anchor skips the check but still emits `unmatched`)
  → warning, one dominant-exudate **info** rollup per guild. Empty
  guild → `[]`.
- `cards/soil-fertility/SoilFoodWebCard.tsx` — read-only audit surface
  (severity rollup + per-guild findings). No store writes, no save gate.
- `store/compostCycleStore.ts` (+ tests, 5) — additive persist slice;
  `byProject` of `CompostBatch[]`; add/update(by id)/remove(by
  id)/clearProject.
- `cards/soil-fertility/CompostCycleCard.tsx` — editable batch rows
  auto-persist (no save gate); method-driven cadence hint; display-only
  feedstock-inventory context line read from `compostInventoryStore`
  (no cross-store write); inline non-blocking warnings (ready-before-
  start, bad cadence, missing feedstock note).
- Registration: 2 append-only edits only (`types.ts` MODULE_CARDS +
  `PlanModuleSlideUp.tsx` lazy import/switch, section ids
  `plan-soil-foodweb` / `plan-compost-cycle`). `soil-fertility` was
  already a registered module → no `PlanModule` union member added, so
  every `Record<PlanModule,_>` map and the `never`-guarded switch stay
  inert (confirmed by tsc, not edited).

## Verification

- `tsc -p apps/web` — no error from any B2 file. Remaining project tsc
  errors (`useFlowEndpointOptions`, `workItemStore*`) are pre-existing
  out-of-band D0 work, not B2.
- `tsc -p packages/shared` — exit 0 (shared untouched; no transitive
  break).
- vitest — `soilFoodWebMath` 10/10 (unmatched info, mycorrhiza
  incoherence, dominant-exudate rollup, anchor-unmatched guard, empty
  → `[]`), `compostCycleStore` 5/5 (seed/upsert/remove idempotency,
  per-project isolation).
- Cards are plain React, sit deep behind `soil-fertility` module nav;
  per the screenshot-honesty rule no browser screenshot is claimed.
  DOM/test-library + tsc are the authoritative gate.
- Final code review (superpowers:code-reviewer): **APPROVE** — all
  additive-isolation constraints verified, only cosmetic Minor notes.

## Commit posture

The working tree is mixed with active uncommitted out-of-band D0 work
(`workItemStore*`, several `*LogStore` edits, `syncManifest.ts`,
`packages/shared/src/index.ts`, `wiki/index.md`, `wiki/log.md`,
`wiki/entities/web-app.md`, goal-compass tabs, etc.). Per CLAUDE.md (do
not clobber others' uncommitted work), every B2 commit used
explicit-path staging only; `git add -A`/`.` was never used. This ADR
is a clean new file committed standalone. `wiki/index.md` and
`wiki/log.md` are themselves dirty with D0 edits, so they are **not**
appended here — entangling them would capture D0's uncommitted work in
a B2 commit. The index/log reconciliation is left to the D0 owner;
flagged in the session debrief. Push deferred to the operator
(`feat/atlas-permaculture` is rebased out-of-band — fetch + check
divergence before any push; never force-push).

## Consequences

- B2 exists and is verified; the soil-biology design view + compost
  cycle planner are live in `soil-fertility`.
- No DB migration, no API endpoint, no schema/goal-tree/`Record<
  PlanModule,_>` change — A-series additive covenant held.
- New persist key `ogden-compost-cycle` isolated from
  `ogden-polyculture` (no migrate) — zero risk to existing slices.
- The out-of-band D0 work is independent and untouched.

## References

- [[2026-05-18-atlas-bd-subproject-decomposition]] — B1–B5 decomposition.
- [[2026-05-18-atlas-b1-plant-system-design-integrity]] — the template
  B2 mirrors (pure module + colocated tests + read-only audit card +
  isolated additive persist slice + 2-file append-only registration).
- `EdgeConnectivityCard` / `TemporalCoherenceCard` — design-validator
  (no goal-tree criterion) precedent.
