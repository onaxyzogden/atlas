# 2026-05-19 — D4: field-execution proof on the WorkItem spine (implement + close)


**Branch.** `feat/atlas-permaculture`. Implemented Sub-project D4
(field-execution proof) end-to-end against the **authoritative** spec
[[specs/2026-05-19-d4-field-proof-design]] via the approved plan
[[plans/2026-05-19-d4-field-proof]], Tasks 1–6.

**Files created/modified.** Schema
`packages/shared/src/schemas/proofEvent.schema.ts` (new) + barrel
export; pure engine `packages/shared/src/lib/fieldProof.ts` (new,
`routeProofTarget`/`classifyProof`/`suggestProofMatches`/
`analyzeFieldProof`) + barrel export + `src/tests/fieldProof.test.ts`;
`apps/web/src/store/proofEventStore.ts` (new, `ogden-work-item-proof`)
+ `syncManifest.ts` registration + `__tests__/proofEventStore.test.ts`;
spine-only `fulfilWorkItem`/`unfulfilWorkItem` on
`apps/web/src/store/workItemStore.ts` +
`__tests__/workItemStore.fulfil.test.ts`; orchestrator
`apps/web/src/features/act/fieldProofActions.ts` (new), surface
`FieldProofPanel.tsx` (new), tracker mount on
`PlanExecutionTrackerCard.tsx` (import + child panel, no manifest
entry) + `__tests__/fieldProofActions.test.ts`. **5th file:** additive
`nurseryStore.updateTransfer` setter mirroring
`maintenanceLogStore.updateEvent` — required because the typed-nursery
proof path needs a `workItemId` back-link stamp and the store had no
updater; independently reviewed as justified/minimal/in-scope.

**Verification outcome.** `@ogden/shared` tsc exit 0 clean +
**253/253 (18 files)** vitest (incl. `fieldProof` 6); web tsc exit 0
clean + **1229/1229 (116 files)** vitest (incl. `proofEventStore` 3,
`workItemStore.fulfil` 4, `fieldProofActions` 2); `vite build` exit 0
(`✓ built in 32.01s`, PWA 717 precache, 8 GiB heap — env not code). The
`ECONNREFUSED`/builtin-samples lines are the expected offline-fallback
path, not failures. Covenant release-gate grep over the 5 shipped D4
files: every lexicon hit is a negative covenant declaration in a
doc-comment or the JS `return` keyword — no real financing/capital
framing. PASS. ADR: [[decisions/2026-05-19-atlas-d4-field-proof]].

**Deliberate layering reconciliation.** `workItemStore.fulfilWorkItem`
kept spine-only (single completion writer, zero app-store deps); the
spec's "route typed event OR generic fallback" responsibility delivered
by the thin `fieldProofActions.ts` orchestrator (RotationScheduleCard
precedent). Net behaviour == spec; documented in the ADR as an
intentional divergence from the spec's prose, not its intent.

**Superseded-parallel-spec resolution.** The parallel-session spec
`2026-05-19-d4-field-execution-proof-design.md` (dedicated
`act-field-proof` card) was already SUPERSEDED — retire-not-delete
(banner commit `3751a1fc`). This slice implements the authoritative
`2026-05-19-d4-field-proof-design.md` (typed D0 event linking, child
panel on the existing tracker, no dedicated card).

**Accepted consequence.** `unfulfilWorkItem` reverses ONLY the spine —
it deliberately does not cascade-remove the generic `ProofEvent` nor
unstamp typed-event `workItemId`. Proof rows are an immutable
orphan-by-design audit trail; a fulfil→unfulfil→re-fulfil cycle returns
the item to 'proven' against retained evidence and can accumulate
generic rows. Intentional, recorded as a known/accepted boundary for a
future D-slice.

**Git state at close.** Five per-task `feat(d4)` commits (`7743e4c4`,
`f9a2ebf4`, `06d08459`, `f01bbfd3`, `44d3d73c`) + this `docs(d4)`
wiki-close, explicit-path staging only (never `git add -A`/`.`).
**Nothing pushed** (branch rebased out-of-band; push is a separate
explicit instruction). The uncommitted D3 working tree and concurrent
out-of-band D0/D2.1 streams left untouched; `wiki/index.md` deliberately
not modified (D0-owned dirty — D2/D3 ADR precedent).

**Deferred.** Live exercise of the proof board / capture /
suggest-confirm flow deferred behind the known MapLibre/WebGL preview
hang (screenshot disclosed-blocked per the screenshot-honesty rule;
two-hit static wiring + web tsc exit 0 is the authoritative proof).
Proof-cleanup on un-fulfil is an explicitly accepted out-of-scope
boundary for a future D-slice.
